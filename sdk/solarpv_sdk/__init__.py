"""Standard-library-only client for an explicitly configured SolarPV server.

No automatic network calls, retries, project adoption or credential persistence.
Server remains responsible for strict physical request/result validation.
"""
import hashlib
import json
import math
import urllib.request
import urllib.error
import urllib.parse

OPERATIONS = frozenset(('battery_protocol', 'interval_calibration', 'pvt_pem_coupled', 'pvice_inventory', 'incoherent_optics', 'stefan_spatial', 'bill_local_ensemble', 'pv_lcoe_scenarios', 'pvdeg_acceleration', 'pvice_massflow', 'coherent_optics', 'grid_support', 'agri_water', 'fpv_balance', 'pem_dispatch', 'pvt_pcm', 'degradation_exposure', 'circular_lca', 'bill_ensemble', 'grounded_scenario', 'integrated', 'thermal_two_node', 'diode_network', 'dc_coupled', 'electrochemical_spm', 'dq_protection_control', 'project_uq', 'hybrid_sizing', 'batch_twin', 'uq_convergence', 'hybrid_design', 'twin_site_holdout', 'cohort_survival', 'oet_patch', 'battery_pybamm', 'tandem_spectrum'))
MAX_INPUT = 8 * 1024 * 1024
MAX_OUTPUT = 32 * 1024 * 1024

class SolarPVError(RuntimeError):
    pass

def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise SolarPVError('DUPLICATE_KEY')
        result[key] = value
    return result

def _float(value):
    number = float(value)
    if not math.isfinite(number):
        raise SolarPVError('NONFINITE')
    return number

def _parse(data):
    try:
        return json.loads(data, parse_float=_float, object_pairs_hook=_unique, parse_constant=lambda _: (_ for _ in ()).throw(SolarPVError('NONFINITE')))
    except (ValueError, UnicodeError, RecursionError) as error:
        raise SolarPVError('INVALID_JSON') from None

def _json(value):
    try:
        return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode('utf-8')
    except (ValueError, TypeError, RecursionError):
        raise SolarPVError('INVALID_JSON') from None

class Client:
    def __init__(self, base_url, token, *, enabled=False, timeout_s=130):
        url = urllib.parse.urlsplit(base_url)
        # Plain HTTP only for explicit loopback development; never follow redirects.
        if url.scheme != 'https' and not (url.scheme == 'http' and url.hostname in ('localhost', '127.0.0.1', '::1')):
            raise SolarPVError('HTTPS_REQUIRED')
        if not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ('', '/'):
            raise SolarPVError('ORIGIN_REQUIRED')
        if not isinstance(token, str) or not token.strip() or any(c in token for c in '\r\n'):
            raise SolarPVError('AUTH_REQUIRED')
        if isinstance(timeout_s, bool) or not isinstance(timeout_s, (float, int)) or not math.isfinite(timeout_s) or not 0 < timeout_s <= 300:
            raise SolarPVError('TIMEOUT_DOMAIN')
        self._origin, self._token, self._enabled, self._timeout = base_url.rstrip('/'), token, enabled, timeout_s

    def _post(self, path, payload):
        if self._enabled is not True:
            raise SolarPVError('SDK_DISABLED')
        body = _json(payload)
        if len(body) > MAX_INPUT:
            raise SolarPVError('INPUT_LIMIT')
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None
        # Do not inherit proxy credentials/settings for a confidential computation request.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
        request = urllib.request.Request(self._origin + path, data=body, method='POST', headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self._token})
        try:
            with opener.open(request, timeout=self._timeout) as response:
                raw = response.read(MAX_OUTPUT + 1)
                if len(raw) > MAX_OUTPUT:
                    raise SolarPVError('OUTPUT_LIMIT')
                job = response.headers.get('X-SolarPV-Job-Id')
        except (urllib.error.URLError, TimeoutError, OSError):
            raise SolarPVError('REQUEST_FAILED_NO_RETRY') from None
        return _parse(raw), job

    def run(self, request):
        if not isinstance(request, dict) or set(request) != {'operation', 'plan'} or not isinstance(request['operation'], str) or request['operation'] not in OPERATIONS:
            raise SolarPVError('UNSUPPORTED_OPERATION')
        response, job_id = self._post('/api/v1/research/run', request)
        try:
            canonical = response['requestCanonicalJson']
            if response['schemaVersion'] != 'research-api-result-v1' or response['operation'] != request['operation'] or hashlib.sha256(canonical.encode()).hexdigest() != response['requestSha256'] or _parse(canonical) != request:
                raise SolarPVError('RESPONSE_BINDING')
            result = response['result']
            if result['validationStatus'] != 'not_field_validated' or result['projectApproval'] != 'blocked':
                raise SolarPVError('RESEARCH_BOUNDARY')
        except (KeyError, TypeError, AttributeError):
            raise SolarPVError('INVALID_RESPONSE') from None
        return {'jobId': job_id, 'envelope': response, 'energyAdoption': False, 'financeMutation': False}

    def review_data(self, series, target):
        response, _ = self._post('/api/v1/research/data/review', {'series': series, 'target': target})
        if not isinstance(response, dict) or response.get('schemaVersion') != 'external-series-review-v1' or response.get('energyAdoption') is not False or response.get('financeMutation') is not False or response.get('researchGate', {}).get('status') != 'blocked':
            raise SolarPVError('RESEARCH_BOUNDARY')
        return response
