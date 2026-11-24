"""Explicit acquisition only. Original Zenodo checksums corroborate mirror bytes.
Default is fully offline verification. This script never runs in the API worker.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'docs/reference-data/chen-validation'
REPO='sayaan1808/battery-fast-charging-optimization-revised'
COMMIT='7a2eefffbc24009e282d6d69b7fe26e1f6cc49a0'
# From original publisher https://zenodo.org/api/records/4032561, not mirror claims.
FILES=[('LGM50_cell02.csv',597715,'0bbf959cbfc367296ec69d7a74d2f5c1','2eb28aa8b8e54486570d9fcfec974ff16aee5000'),('LGM50_cell03.csv',590794,'a09cbd8eff0af55dfe9bc8728fa89908','9e449192a360cb5b5cb3d869910d9115b57cd467'),('LGM50_cell04.csv',595967,'f17615476283d2e15087165697ff9d7c','56633161b79a7f8e86a7c7f5ed4e973975c28fe4')]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--fetch',action='store_true');args=parser.parse_args();records=[]
    if args.fetch:DATA.mkdir(parents=True,exist_ok=True)
    for name,size,md5,blob in FILES:
        path=DATA/name
        if args.fetch:
            response=json.loads(subprocess.check_output(['gh','api',f'repos/{REPO}/git/blobs/{blob}'],timeout=30));data=base64.b64decode(response['content'])
        else:data=path.read_bytes()
        actual_blob=hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
        if len(data)!=size or hashlib.md5(data).hexdigest()!=md5 or actual_blob!=blob:raise ValueError('Original publisher size/checksum or pinned Git blob mismatch')
        if args.fetch:path.write_bytes(data)
        records.append(dict(path=str(path.relative_to(ROOT)),size=size,publisherMd5=md5,gitBlob=blob,sha256=hashlib.sha256(data).hexdigest()))
    manifest=dict(schemaVersion='chen-validation-acquisition-v1',originalDoi='10.5281/zenodo.4032561',originalMetadataUrl='https://zenodo.org/api/records/4032561',license='CC-BY-4.0',licenseEvidence='Original publisher metadata.license.id=cc-by-4.0; fetched via page tool. Metadata subset is transcribed, not an exact API-byte snapshot.',mirrorRepository=REPO,mirrorCommit=COMMIT,identityCaveat='Publisher MD5 and size corroborate accidental byte identity, not a cryptographic authenticity signature; local SHA256 and pinned Git blobs lock subsequent replay.',transformations='none; original CSV bytes preserved',qualification='acquisition_integrity_only_not_model_or_project_validation',files=records)
    path=DATA/'manifest.json'
    if args.fetch:path.write_text(json.dumps(manifest,indent=2)+'\n')
    elif json.loads(path.read_text())!=manifest:raise ValueError('Acquisition manifest mismatch')
    print('PASS three original-publisher-checksummed Chen2020 cell CSVs; no model qualification claim')
if __name__=='__main__':main()
