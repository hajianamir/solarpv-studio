"""Native Safari App + advanced dispatch + real PDF contracts. Run only on macOS.
Requires safaridriver --enable, selenium, pypdf and the pinned pvlib runtime.
Downloads are captured at the browser Blob boundary to avoid OS permission dialogs;
the production export function still creates the real PDF bytes, read by pypdf.
"""
import os
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
import base64
import io
import json
from pathlib import Path
import platform
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

def main():
    if platform.system() != 'Darwin':
        print('NOT RUN: native Safari requires macOS + safaridriver; WebKit/Linux is not Safari', file=sys.stderr)
        return 2
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from pypdf import PdfReader
    from services.pvlib_study.worker import run_study
    evidence = ROOT / '.cache/platform-evidence/native-safari'
    evidence.mkdir(parents=True, exist_ok=True)
    port = 5207
    logs = open(evidence / 'server.log', 'w')
    server = subprocess.Popen(['node', '--import', 'tsx', 'server.ts'], cwd=ROOT,
                              env={**os.environ, 'PORT': str(port), 'NODE_ENV': 'production', 'REAL_INTERNET': 'false', 'VITE_REAL_INTERNET': 'false'}, stdout=logs, stderr=logs)
    driver = None
    receipt = {'status': 'RUNNING', 'platform': platform.platform(), 'results': []}
    try:
        import urllib.request
        deadline = time.time() + 60
        while True:
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=2)
                break
            except Exception:
                if time.time() > deadline or server.poll() is not None:
                    raise RuntimeError('Production server did not become ready')
                time.sleep(.2)
        driver = webdriver.Safari()
        receipt['capabilities'] = driver.capabilities
        assert driver.capabilities.get('browserName', '').lower() == 'safari', 'Not native Safari'
        wait = WebDriverWait(driver, 120)
        driver.set_script_timeout(120)
        driver.get(f'http://127.0.0.1:{port}')
        def button(text):
            return driver.find_element(By.XPATH, f"//button[normalize-space(.)='{text}']")
        def tab():
            next(x for x in driver.find_elements(By.CSS_SELECTOR, '[data-testid="workflow-tab-climate"]') if x.is_displayed()).click()
        wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '[data-testid="operational-energy-panel"]'))
        tab()
        next(x for x in driver.find_elements(By.TAG_NAME, 'button') if 'ویرایش پارامترهای اقلیمی' in x.text or 'Edit Climate Parameters' in x.text).click()
        for field, value in [('climate-latitude-input', '32.2'), ('climate-longitude-input', '-110.9')]:
            element = driver.find_element(By.ID, field)
            element.clear()
            element.send_keys(value)
        next(x for x in driver.find_elements(By.TAG_NAME, 'button') if 'اعمال پارامترهای سفارشی' in x.text or 'Apply Custom Parameters' in x.text).click()
        driver.execute_script("""
        window.__latestExport=null;
        const original=URL.createObjectURL;
        URL.createObjectURL=function(blob){window.__latestExport=blob;return original.call(URL,blob);};
        document.addEventListener('click',e=>{const a=e.target.closest('a[download]');if(a)e.preventDefault();},true);
        """)
        def export_bytes(label):
            driver.execute_script('window.__latestExport=null')
            button(label).click()
            wait.until(lambda d: d.execute_script('return !!window.__latestExport'))
            encoded = driver.execute_async_script("""const done=arguments[0],r=new FileReader();r.onload=()=>done(r.result.split(',')[1]);r.onerror=()=>done(null);r.readAsDataURL(window.__latestExport);""")
            assert encoded
            return base64.b64decode(encoded)
        fixture = json.loads((ROOT / '.cache/study-evidence/operational/annual-direct.json').read_text())
        for mode in ['powerplant', 'ongrid', 'offgrid']:
            if mode != 'powerplant':
                button('On-Grid' if mode == 'ongrid' else 'Off-Grid').click()
            tab()
            context = json.loads(export_bytes('Download operational context'))
            assert context['mode'] == mode
            request = json.loads(json.dumps(fixture['request']))
            request['system']['arrayPdc0W'] = context['dcCapacityKwp'] * 1000
            request['system']['inverterPdc0W'] = context['inverterCapacityKw'] * 1000 / request['system']['inverterEtaNom']
            result = run_study(request)
            plan = {'schemaVersion': 'operating-dispatch-v1', 'mode': mode,
                    'source': 'Synthetic native Safari operating test only', 'intervalMinutes': 60,
                    'battery': {'capacityKwh': context.get('batteryCapacityKwh', 0), 'minSocFraction': .1, 'initialSocFraction': .1, 'maxChargeKw': 10, 'maxDischargeKw': 10, 'chargeEfficiency': .9, 'dischargeEfficiency': .9},
                    'records': [{'timestamp': s['timestamp'], 'loadW': 0 if mode == 'powerplant' else 500, 'gridAvailable': mode != 'offgrid', 'exportLimitW': 1e9} for s in result['samples']]}
            operating = {'schemaVersion': 'operating-study-v1', 'pvResults': result, 'plan': plan}
            file = evidence / f'{mode}-input.json'
            file.write_text(json.dumps(operating))
            driver.find_element(By.CSS_SELECTOR, '[aria-label="Import operational annual results"]').send_keys(str(file))
            driver.find_element(By.CSS_SELECTOR, '[aria-label="Operational acknowledgement"]').send_keys('Synthetic native Safari explicit acceptance')
            wait.until(lambda d: button('Use validated annual energy').is_enabled())
            button('Use validated annual energy').click()
            wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '[data-testid="operational-energy-active"]'))
            driver.find_element(By.XPATH, "//button[contains(@title,'Ctrl+E')]").click()
            wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '[data-testid="operational-report"]'))
            pdf = export_bytes('Download operational PDF')
            (evidence / f'{mode}-operational.pdf').write_bytes(pdf)
            reader = PdfReader(io.BytesIO(pdf))
            text = '\n'.join(page.extract_text() for page in reader.pages)
            assert mode in text and 'EPC design annex' in text and 'engineering.protection' in text
            button('Close operational report').click()
            before = driver.find_element(By.CSS_SELECTOR, '[data-testid="active-energy-source"]').text
            advanced = {'schemaVersion': 'advanced-study-v1', 'pvResults': result, 'plan': {
                'schemaVersion': 'advanced-dispatch-v1', 'operatingPlan': plan, 'controller': 'optimal-discrete',
                'optimizer': {'socStates': 3, 'terminalSocFraction': .1, 'batteryWearTomanPerKwh': 5, 'unmetPenaltyTomanPerKwh': 100000},
                'diesel': None if mode != 'offgrid' else {'source': 'Synthetic Safari diesel parameters only', 'ratedKw': 2, 'minLoadFraction': .1, 'interceptLitersPerHour': .2, 'slopeLitersPerKwh': .25, 'fuelTomanPerLiter': 100, 'startCostToman': 10, 'initiallyOn': False},
                'aging': None if mode == 'powerplant' else {'source': 'Synthetic Safari aging parameters only', 'initialSoh': 1, 'endOfLifeSoh': .8, 'calendarLossFractionPerYear': .01, 'lossFractionPerEfc': .00001, 'projectionYears': 25},
                'economics': [{'timestamp': s['timestamp'], 'importTomanPerKwh': 200, 'exportTomanPerKwh': 50, 'dieselAvailable': mode == 'offgrid'} for s in result['samples']]}}
            advanced_file = evidence / f'{mode}-advanced-input.json'
            advanced_file.write_text(json.dumps(advanced))
            driver.find_element(By.CSS_SELECTOR, '[aria-label="Import advanced operating study"]').send_keys(str(advanced_file))
            wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '[data-testid="advanced-dispatch-result"]'))
            assert driver.find_element(By.CSS_SELECTOR, '[data-testid="active-energy-source"]').text == before
            ledger = json.loads(export_bytes('Download advanced ledger JSON'))
            assert ledger['result']['optimality'] == 'global_optimum_on_declared_lattice_only'
            pdf = export_bytes('Download advanced PDF')
            (evidence / f'{mode}-advanced.pdf').write_bytes(pdf)
            text = '\n'.join(page.extract_text() for page in PdfReader(io.BytesIO(pdf)).pages)
            assert mode in text and ledger['sourceSha256'] in ''.join(text.split())
            driver.save_screenshot(str(evidence / f'{mode}.png'))
            receipt['results'].append({'mode': mode, 'advanced': 'PASS', 'realPdfReadback': 'PASS'})
            button('Return to screening').click()
        receipt['status'] = 'PASS'
        print(json.dumps(receipt, indent=2))
        return 0
    except Exception as exc:
        receipt.update(status='FAIL', error=str(exc))
        if driver:
            print('FAILURE PAGE TEXT: ' + driver.find_element(By.TAG_NAME, 'body').text[-18000:], file=sys.stderr)
            driver.save_screenshot(str(evidence / 'failure.png'))
        raise
    finally:
        (evidence / 'receipt.json').write_text(json.dumps(receipt, indent=2))
        if driver:
            driver.quit()
        server.terminate()
        try:
            server.wait(timeout=15)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        logs.close()

if __name__ == '__main__':
    raise SystemExit(main())
