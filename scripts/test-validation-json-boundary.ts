import assert from 'node:assert/strict';
import {parseStudyJson} from '../src/studies/strictStudyJson';
const good={source:'quote " slash \\ braces{}[] , :',unicode:'اندازه‌گیری',nested:[{a:1},{a:2}],valid:true,no:null};
assert.deepEqual(parseStudyJson(JSON.stringify(good),64000),good);assert.deepEqual(parseStudyJson('\uFEFF'+JSON.stringify(good,null,2),64000),good);
for(const bad of ['{"source":1,"source":2}','{"source":1,"\\u0073ource":2}','{"a":[{"v":1,"v":2}]}','{"a":{"x":1,"x":2},"b":0}','{"x":1e999}','[-1e999]','{"a":NaN}','{','[1,]','[[1]'])assert.throws(()=>parseStudyJson(bad,64000));
assert.throws(()=>parseStudyJson('['.repeat(66)+'0'+']'.repeat(66),64000),/nesting/);assert.throws(()=>parseStudyJson('é'.repeat(40),64),/byte/);assert.deepEqual(parseStudyJson('[{"a":1},{"a":2}]',64),[{a:1},{a:2}]);
console.log('Validation JSON boundary PASS: duplicate decoded keys (including escaped/nested), nonfinite/deep/malformed/oversize rejected; valid Unicode/escaping/BOM/repeated names in separate objects retained.');
