import unittest
from solarpv_sdk import Client, SolarPVError, _parse

class ClientTests(unittest.TestCase):
    def test_origins_and_credentials(self):
        for url in ('http://example.org', 'https://user:pass@example.org', 'https://example.org/a', 'https://example.org?x=1', 'file:///tmp/a'):
            with self.assertRaises(SolarPVError): Client(url, 'synthetic')
        for timeout in (True, 0, 301, float('inf')):
            with self.assertRaises(SolarPVError): Client('https://example.org', 'synthetic', timeout_s=timeout)
        with self.assertRaises(SolarPVError): Client('https://example.org', 'bad\r\ntoken')

    def test_strict_json_and_disabled(self):
        for text in ('{"a":1,"a":2}', '{"a":NaN}', '{"a":1e999}'):
            with self.assertRaises(SolarPVError): _parse(text)
        with self.assertRaisesRegex(SolarPVError, 'SDK_DISABLED'):
            Client('https://example.org', 'synthetic').review_data({}, {})

    def test_tampered_binding_and_boundary(self):
        c = Client('https://example.org', 'synthetic', enabled=True)
        request = {'operation':'diode_network', 'plan':{}}
        for response in ({}, {'operation':'diode_network','schemaVersion':'research-api-result-v1','requestCanonicalJson':'{}','requestSha256':'0'*64}):
            c._post = lambda *args: (response, None)
            with self.assertRaises(SolarPVError): c.run(request)
        c._post = lambda *args: ({'schemaVersion':'external-series-review-v1','energyAdoption':True}, None)
        with self.assertRaises(SolarPVError): c.review_data({}, {})
        for operation in ('transient', 'monte_carlo', []):
            with self.assertRaises(SolarPVError): c.run({'operation':operation, 'plan':{}})

if __name__ == '__main__': unittest.main()
