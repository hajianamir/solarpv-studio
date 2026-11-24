"""Explicit caller opt-in only. No credentials embedded or saved."""
import json
import os
from solarpv_sdk import Client

if __name__ == '__main__':
    client = Client(os.environ['SOLARPV_ORIGIN'], os.environ['SOLARPV_TOKEN'], enabled=os.environ.get('SOLARPV_SDK_ENABLED') == 'true')
    with open('docs/examples/external-series.synthetic.json', encoding='utf-8') as file:
        data = json.load(file)
    result = client.review_data(data['series'], data['target'])
    # Do not print confidential input, token or raw SCADA.
    print(result['status'], result['energyAdoption'])
