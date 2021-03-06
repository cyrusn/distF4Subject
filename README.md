# Introduction
This mini programme is for Secondary School in Hong Kong, NSS subject selection.
distF4Subject will distribute subject to every student who use the `f4SubjectSelection`.

# Preparation
- install `node.js`
    + [Node.js](https://nodejs.org/)
- run `npm install`
- prepare the following files
  + `./data/downloadData.json`
    * which is the json file download from `f4SubjectSelection` programme
    * or create as the following example.
    * ***remove*** dummy and teacher account.
  + `./data/studentRank.csv`
    * In fairness, rank in form shouldn't be duplicated.
    * please see below for format of `./data/studentRank.csv`
- customise capacity of each subjects in `./data/subjectCapacity.json`
- run `node main.js`

# Result
this programme will only distribute subject to the student who *confirmed* the form and have `rank`
`result.csv` and `statistic.md` will be generated in `./result` folder

# Example

## example of downloadData.json
directly download from f4 subject selection system
```js
// example of downloadData.json
[{
    "_id": "lp1234567",
    "classNo": "3A01",
    "name": "Lee Sei",
    "cname": "李四",
    "isConfirmed": true,
    "D&T": 2,
    "Cookery": 1,
    "Music": 3,
    "phy+chem": 7,
    "phy+cscb": 14,
    "phy+econ": 5,
    "phy+geog": 13,
    "phy+hist": 6,
    "phy+ict2": 12,
    "bio+chem": 30,
    "bio+cscp": 32,
    "bio+econ": 19,
    "bio+geog": 29,
    "bio+hist": 11,
    "bio+ict2": 31,
    "bafs+chem": 21,
    "bafs+cscb": 8,
    "bafs+cscp": 10,
    "bafs+econ": 3,
    "bafs+geog": 20,
    "bafs+hist": 4,
    "bafs+ict2": 22,
    "ths+chem": 38,
    "ths+cscb": 35,
    "ths+cscp": 37,
    "ths+econ": 24,
    "ths+geog": 34,
    "ths+hist": 15,
    "ths+ict2": 36,
    "chist+chem": 9,
    "chist+cscb": 16,
    "chist+cscp": 23,
    "chist+econ": 1,
    "chist+geog": 17,
    "chist+hist": 2,
    "chist+ict2": 18,
    "ict1+chem": 39,
    "ict1+cscb": 46,
    "ict1+cscp": 43,
    "ict1+econ": 26,
    "ict1+geog": 45,
    "ict1+hist": 25,
    "va+chem": 41,
    "va+cscb": 33,
    "va+cscp": 44,
    "va+econ": 27,
    "va+geog": 42,
    "va+hist": 28,
    "va+ict2": 40
}, ...
]
```

## example of studentRank.csv
``` csv
// `+` is used to define data as integer
_id,rank+
lp1234567,1
lp1234576,2
lp1234675,3
...
```

# Procedure in LPSS

## Prepartion
- each subjects can add 2 or minute 2 places.
- VP need to declare of the max and min of each subjects

## Algorithm of subject allocation
1. take the mean of no of f3 students (with f4 repeater), and allocate the student evenly in `subjectCapacity.json`, places for f4 repeater should be reserved.(mean minutes no of repeat of each subjects)

2. run `node main.js`

3. `+1` capacity to the *first full* subject, then run `node main.js`.

4. `-1` capacity to the subject which the allocation drop, if there are capacity of subject reach the max capacity of the subject, add the subject to `hiddenList` according to its group in `subjectCapacity.json`
, then run `node main.js`

5. repeat step 3 until any subject's capacity drop below the min.
