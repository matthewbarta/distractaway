function arrayDifference(oldArray, newArray) {
    for(let index = 0; index < oldArray.length; index++) {
      if(!newArray.includes(oldArray[index])) {
        return oldArray[index];
      }
    }
  }

  console.log(arrayDifference(['a','b'], ['b']));