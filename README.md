# Introduction
This mini programme is for Secondary School in Hong Kong, NSS subject selection.
distF4Subject will distribute subject to every student who use the `f4SubjectSelection`.

# Preparation
- install node.js
- run `npm install`
- create an empty folder named as `result`
- prepare the following files
  + `./data/downloadData.json`
    * the json file download from `f4SubjectSelection` programme
    * or see the following example.
    * remove dummy and teacher account before use.
  + `./data/positionInForm.json`
    * In fairness, position in form shouldn't be duplicated.
    * please see below for format of `positionInForm.json`
- customise class size of each group in `classSize.json`
- run `node main.js`

# Result
this programme will only distribute subject to the student who *confirmed* the form and have `position in form`

# Example
```js
// example of positionInForm.json
[{
    "_id": "lp1234567",
    "position": 1
}, {
    "_id": "lp1234576",
    "position": 2
}, {
    "_id": "lp1234675",
    "position": 3
}, {
    "_id": "lp1234765",
    "position": 4
}, {
    "_id": "lp1234756",
    "position": 5
}, ...
]
```
