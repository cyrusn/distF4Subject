var fs            = require('fs');
var _             = require('lodash');
var json2csv      = require('json2csv');
var csvjson       = require('csvjson');
var messageFormat = require('messageformat');
var colors        = require('colors');

var StudentPriorities = require('./data/downloadData.json');

// array of students id ordered by rank.
// https://www.npmjs.com/package/csvjson#convert-csv-data-to-schema-json-object
var StudentRank       = _.pluck(_.sortBy(csvjson.toSchemaObject('./data/studentRank.csv').output,"rank"), '_id');
var SubjectCombo      = require('./data/subjectCombo.json');
var groupOneCapacity  = require('./data/subjectCapacity.json').group1;
var groupTwoCapacity  = require('./data/subjectCapacity.json').group2;

var hiddenList1 = require('./data/subjectCapacity.json').hiddenList1;
var hiddenList2 = require('./data/subjectCapacity.json').hiddenList2;

var fullListInOrder = [];
var groupOneOccupied = {
    "phy": 0,
    "bio": 0,
    "bafs": 0,
    "chist": 0,
    "ths": 0,
    "ict1": 0,
    "va": 0
};
var groupTwoOccupied = {
    "chem": 0,
    "cscb": 0,
    "cscp": 0,
    "econ": 0,
    "hist": 0,
    "geog": 0,
    "ict2": 0
};

// sort the Students by academic rank
// returned array will not have the following student record.
// - students who didn't submit the form.
// - students who have no ranking in form
function sortStudentsByRank(orders, students) {
  return _(students)
            .map(
              function(sts) {
                // add rank to each student
                var rank = _.indexOf(orders, sts._id) + 1;
                return _.assign(flattenData(sts), {"rank": rank });
              })
            // _.remove return new array of removed elements
            .remove(function(sts) {
                // return sts.isConfirmed &&
                //       (sts.rank !== undefined) &&
              return /lp[0-9]{7}/.test(sts._id) && (sts.rank !== 0 );
            })
            .sortBy("rank")
            .value();
}

var sortedStudents = sortStudentsByRank(StudentRank, StudentPriorities);

// total number of student who submitted the form
var noOfStudent = sortedStudents.length;

// convert student's ole and choices to array of their choices,
function flattenData(sts) {
  if (!sts.isConfirmed) return sts;

  var index = 0;
  var obj = {};
  var choices = [];

  _.map(sts, function(value, key) {
    if (index < 8) {
      obj[key] = value;
    } else if (index < 54) {
      choices.push(value);
    } else {
      obj[key] = value;
    }
    index += 1;
  });
  obj.choices = choices;
  return obj;
}

// return the total number of a group
// e.g. if you want to get total no of student in current group 1,CapacityOccupied// totalNumberInGroup(groupOnesubjectCapacityOccupied
function totalCapacity(subjectCapacity) {
  var result = 0;
  _.map(subjectCapacity, function(value, key) {
    result += value;
  });
  return result;
}

// counter for statistic
var counter = (function() {
  var obj = {};
  obj.firstChoiceCounter = 0;
  obj.secondChoiceCounter = 0;
  obj.thirdChoiceCounter = 0;
  obj.bestFiveCounter = 0;
  obj.bestTenCounter = 0;

  return function triggerCounter (number) {
    if (number < 4) {
      obj.bestFiveCounter += 1;
      obj.bestTenCounter += 1;
    }
    switch(number) {
      case 1:
        obj.firstChoiceCounter += 1;
      break;
      case 2:
        obj.secondChoiceCounter += 1;
      break;
      case 3:
        obj.thirdChoiceCounter += 1;
      break;
      default:
        if (number < 6) {
          obj.bestFiveCounter += 1;
        } else if (number < 11) {
          obj.bestTenCounter += 1;
        }
    }
    return obj;
  };
}());

// choice is an array of order of subject combination.
// the nth choice of subject combination
function assignSubject(choices, n) {

  // if loop over the total number of combination, throw error
  if (n > 46) {
    throw new Error("Error! no subject match!:\n" + genStat());
  }

  var result = {};
  // get the subject code from user's nth choice
  var subjects =  SubjectCombo[choices.indexOf(n)].split("+");
  var isX1Available = groupOneOccupied[subjects[0]] < groupOneCapacity[subjects[0]];
  var isX2Available = groupTwoOccupied[subjects[1]] < groupTwoCapacity[subjects[1]];

  // if both subject are full
  if (isX1Available && isX2Available) {
    result.x1 = subjects[0];
    result.x2 = subjects[1];
    result.rankInX1 = (groupOneOccupied[subjects[0]] += 1);
    result.rankInX2 = (groupTwoOccupied[subjects[1]] += 1);
    result.priority = n;
    counter(n);
    return result;
  } else {
    // var checkfullListInOrder = fullListInOrder.x1.length <= 1 && fullListInOrder.x2.length <= 1;
    if(!isX1Available && _.indexOf(hiddenList1, subjects[0])== -1) {
      if (_.indexOf(fullListInOrder, subjects[0]) == -1) {
        fullListInOrder.push(subjects[0]);
      }
    }
    if(!isX2Available && _.indexOf(hiddenList2, subjects[1])== -1) {
      if (_.indexOf(fullListInOrder, subjects[1]) == -1) {
        fullListInOrder.push(subjects[1]);
      }
    }
  }

  try {
    return assignSubject(choices, n + 1);
  }
  catch (err) {
    // if error of occur (n > 46)
    console.error(colors.red.bold(err.message));
    return false;
  }
}

function execAssignToAllStudent(students) {
  return _(students)
            .map(function(sts) {
              if (!sts.isConfirmed) return sts;

              var choices = sts.choices;
              var subjectResult;

              // init the from the student's first choice
              subjectResult = assignSubject(choices, 1);
              if (!subjectResult) {
                console.log("Can't assign subject to %s", sts._id);
                return sts;
              }

              console.log("assigned subject to: %s ", sts._id);
              return _.assign(sts, subjectResult);
            })
            .sortBy("classNo")
            .value();
}

// generate statistic
function genStat (detail) {
  var mf = new messageFormat('en');
  // get the final value of counter
  var counterResult = counter();

  var group1 = _.mapValues(groupOneOccupied, function(value, key) {
    return  value + '/' + groupOneCapacity[key];
  });

  var group2 = _.mapValues(groupTwoOccupied, function(value, key) {
    return  value + '/' + groupTwoCapacity[key];
  });

  var obj = {
    noOfStudent: noOfStudent,
    group1TotalOccupied: totalCapacity(groupOneOccupied),
    group2TotalOccupied: totalCapacity(groupTwoOccupied),
    group1TotalCapacity: totalCapacity(groupOneCapacity),
    group2TotalCapacity: totalCapacity(groupTwoCapacity),
    firstChoiceCounter: counterResult.firstChoiceCounter,
    secondChoiceCounter: counterResult.secondChoiceCounter,
    thirdChoiceCounter: counterResult.thirdChoiceCounter,
    bestFiveCounter: counterResult.bestFiveCounter,
    bestTenCounter: counterResult.bestTenCounter,
    groupOneOccupied: JSON.stringify(group1, null, "\t"),
    groupTwoOccupied: JSON.stringify(group2, null, "\t"),
  };

  var statistic = "# statistic of F4 subject selection\n";
  statistic += "Total Number of Student: {noOfStudent}\n";
  statistic += "X1: {group1TotalOccupied}/ {group1TotalCapacity}\n";
  statistic += "X2: {group2TotalOccupied}/ {group2TotalCapacity}\n";
  if (detail) {
    statistic += "no of first choice: {firstChoiceCounter}\n";
    statistic += "no of second choice: {secondChoiceCounter}\n";
    statistic += "no of third choice: {thirdChoiceCounter}\n";
    statistic += "no of best five: {bestFiveCounter}\n";
    statistic += "no of best ten: {bestTenCounter}\n";
  }
  statistic += "\n```js\n";
  statistic += "// Group1\n";
  statistic += "{groupOneOccupied}\n";
  statistic += "```\n";
  statistic += "\n```js\n";
  statistic += "// Group2\n";
  statistic += "{groupTwoOccupied}\n";
  statistic += "```\n";

  var vfunc = mf.compile(statistic);
  return vfunc(obj);
}

var finalResult = execAssignToAllStudent(sortedStudents);

// if need to show all fields, use the defaultField instead.
var defaultField = ["_id", "classNo", "name", "isConfirmed", "D&T", "Cookery", "Music", "phy+chem", "phy+cscb", "phy+econ", "phy+geog", "phy+hist", "phy+ict2", "bio+chem", "bio+cscp", "bio+econ", "bio+geog", "bio+hist", "bio+ict2", "bafs+chem", "bafs+cscb", "bafs+cscp", "bafs+econ", "bafs+geog", "bafs+hist", "bafs+ict2", "ths+chem", "ths+cscb", "ths+cscp", "ths+econ", "ths+geog", "ths+hist", "ths+ict2", "chist+chem", "chist+cscb", "chist+cscp", "chist+econ", "chist+geog", "chist+hist", "chist+ict2", "ict1+chem", "ict1+cscb", "ict1+cscp", "ict1+econ", "ict1+geog", "ict1+hist", "va+chem", "va+cscb", "va+cscp", "va+econ", "va+geog", "va+hist", "va+ict2", "x1", "x2", "rankInX1", "rankInX2", "priority", "rank" ];
var field = defaultField;

fs.writeFileSync("./result/result.json", JSON.stringify(finalResult, null, "\t"));

// convert result from json to csv format
function prepareJsonToCsvData(students) {
  return _.map(finalResult, function(sts) {
    if (!sts.isConfirmed) return sts;
    var choices = _.zipObject(SubjectCombo, sts.choices);
    return _(sts)
              .assign(choices)
              .omit('choices')
              .value();
  });
}

json2csv({data: prepareJsonToCsvData(finalResult), fields: field}, function(err, csv) {
  if (err) throw err;
    fs.writeFileSync("./result/result.csv", csv);
});

// print statistic
fs.writeFileSync("./result/statistic.md", genStat(true));

console.log("Hidden Subject:".underline.yellow, hiddenList1, hiddenList2);
console.log("list of first full data:\n".bold.red, fullListInOrder);
console.log(statResult);
