const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const DIVS = ["add-site", "site-list", "general"];
const zeroRegex = /00+/;
let siteList = [];
let pin = "";
let pinSuccess = false;

//TODO Stats tab time spent on each site.
//TODO Only allow specific types of URLs
//TODO Parental locks on edit/remove using a 4 digit PIN.
//TODO Same limit every day (?)
//TODO Validation on forms to stop copy-pasting. SEE KEYDOWN RETURN FALSE

//! FOR DEBUGGING
const bkg = chrome.extension.getBackgroundPage();

$(function () {
  //Creates the site elements.
  chrome.storage.sync.get("timeList", function (items) {
    siteList = items.timeList;
    updateSiteList(siteList);
  });

  //Creates the week elements.
  createWeekDropdown("weekday-input");

  //Puts in the current url.
  chrome.storage.sync.get({ currentURL: "" }, function (url) {
    if (url.currentURL) {
      let trimmedURL = trimURL(url.currentURL);
      $("#block-site").val(trimmedURL);
    }
  });
  //On submission, reset the form and send the data to the background script.
  $("#submit-button").click(function () {
    let url = $("#block-site").val();
    if (url) {
      //Store the given url if it is not a duplicated.
      chrome.storage.sync.get(["timeList"], function (items) {
        let list = items.timeList;
        storeTimeList(list, url);
        resetForm("week-form-");
      });
    } else {
      alert("No URL submitted!");
    }
  });

  //Hides the other page divs, shows the clicked div.
  for(let index = 0; index < DIVS.length; index++) {
    $(`#${DIVS[index]}-tag`).click(function () {
      showDiv(`${DIVS[index]}`);
    });
  }

  //Reset the form
  $("#reset-button").click(function () {
    resetForm("week-form-");
  });

  //Minimized form options.
  $(`#minimized-input`).click(function () {
    if($(this).is(":checked")) {
      chrome.storage.sync.set({timeMinimized: true}, function() {});
    }
    else {
      chrome.storage.sync.set({timeMinimized: false}, function() {});
    }
  });

  $(`#parental-control-input`).click(function() {
    if($(this).is(":checked") && pin == "") {
      $(`#add-pin`).modal('show');
    }
    //When unchecked.
    else if(!$(this).is(":checked") && pin != "") {
      disablePin();
    }
  });

  //Save button on the add pin modal.
  $(`#save-pin-button`).click(function() {
    enablePin();
  });

  //Behavior when cancelling add pin modal.
  $(`#cancel-pin-button`).click(function() {
    $(`#parental-control-input`).prop('checked', false);
    clearAddPin();
  });

  //Blocks user from entering non-numeric digits.
  $(`#initial-pin`).keydown(function(event) {
    const keyPress = event.which - 48;
    //-40 is backspace.
    if((keyPress < 0 || keyPress > 9) && keyPress != -40) {
      return false;
    }
  });
  $(`#confirm-pin`).keydown(function(event) {
    const keyPress = event.which - 48;
    //-40 is backspace.
    if((keyPress < 0 || keyPress > 9) && keyPress != -40) {
      return false;
    }
  });

  //Has correct state checked for checkbox.
  chrome.storage.sync.get('timeMinimized', function(items) {
    const minimized = items.timeMinimized;
    $(`#minimized-input`).prop("checked", minimized);
  });

  //Switches to the correct div when transitioning from a block-state popup.
  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    if (message.settings) {
      showDiv("site-list");
      return;
    }
    //For updating the url in the input box even if options page is already open or has input.
    else if (message.url) {
      //Trim the new url and change the DOM to reflect.
      $("#block-site").val(trimURL(message.url));
      showDiv("add-site");
    }
  });
});

//Show this div, hide the others.
function showDiv(id = "") {
  for (let index = 0; index < DIVS.length; index++) {
    if (DIVS[index] == id) continue;
    $(`#${DIVS[index]}`).hide();
  }
  $(`#${id}`).show();
}

function clickSave() {
  //Controls the pin modal, returns it as a promise to fulfill.
  return new Promise((resolve, reject) => {
    $(`#save-changes-button`).off('click').on('click', function() {
      bkg.console.log('TEST');
      if(pin == $(`#enter-pin`).val()) {
        resolve(true);
        $(`#require-pin`).modal('hide');
      }
      else {
        resolve(false);
        $(`#require-pin`).modal('hide');
      }
    });
    $(`#cancel-changes-button`).off('click').on('click', function() {
      bkg.console.log('TEST');
      $(`#require-pin`).modal('hide');
      resolve(false);
    });
  });
  }

function clearAddPin() {
  $(`#initial-pin`).val('');
  $(`#confirm-pin`).val('');
}

//Checks for a duplicate link, if none exists, add the site to the blocked list.
function storeTimeList(urlTimeArray, url) {
  //If the link is a duplicate.
  if (isInTimeList(urlTimeArray, url)) {
    alert(
      "This link has already been added to the site list, if you want to modify it, go to the site list."
    );
  }
  //If it's a unique URL add it to the timelist, with a default time of 15 seconds.
  else {
    const times = getTimesByWeekday();
    urlTimeArray.push({ url: url, time: times });
    siteList = urlTimeArray;
    chrome.storage.sync.set({ timeList: urlTimeArray }, function () {
      updateSiteList(siteList);
    });
  }
}

//Function to enable the pin.
function enablePin() {
  const initialPin = $(`#initial-pin`).val();
  const confirmPin = $(`#confirm-pin`).val();
  if(Number.isInteger(parseInt(initialPin)) && (confirmPin == initialPin) && initialPin.length == 4) {
    pin = initialPin;
    $("#add-pin").modal('hide');
    clearAddPin();
  }
  else {
    bkg.console.log('EPIC FAIL');
  }
};

//Function to disable the pin.
function disablePin() {
  bkg.console.log('PIN DISABLED');
  pin = "";
};

//Require PIN
//TODO MIGHT REQUIRE PROMISES
async function requirePin() {
  $(`#require-pin`).modal('show');
  return await clickSave();
}

//Returns a formatted version of the form information for the inputs regarding the block time per day.
function getTimesByWeekday(id = "") {
  let weekdayTimes = [];
  for (let day = 0; day < WEEKDAYS.length; day++) {
    if (document.getElementById(`${WEEKDAYS[day]}-div-${id}`) == null) {
      weekdayTimes.push({ timeUsed: 0, dayLimit: -1 });
    } else if ($(`#${WEEKDAYS[day]}-blocked-${id}`).is(":checked")) {
      weekdayTimes.push({ timeUsed: 0, dayLimit: 0 });
    } else {
      const hours = Number.isInteger(
        parseInt($(`#${WEEKDAYS[day]}-hr-${id}`).val())
      )
        ? parseInt($(`#${WEEKDAYS[day]}-hr-${id}`).val())
        : 0;
      const minutes = Number.isInteger(
        parseInt($(`#${WEEKDAYS[day]}-min-${id}`).val())
      )
        ? parseInt($(`#${WEEKDAYS[day]}-min-${id}`).val())
        : 0;
      const seconds =
        convertToSeconds(hours, minutes) > 0
          ? convertToSeconds(hours, minutes)
          : -1;
      weekdayTimes.push({
        timeUsed: 0,
        dayLimit: seconds,
      });
    }
  }
  return weekdayTimes;
}

//Creates the dropdown menu for selecting weekdays.
function createWeekDropdown(parentElement, id = "") {
  createDiv(parentElement, "dropdown", `dropdown-${id}`);
  dropdownProperties = [
    { property: "data-toggle", value: "dropdown" },
    { property: "aria-haspopup", value: "true" },
    { property: "aria-expanded", value: "false" },
  ];
  createButtonElement(
    `dropdown-${id}`,
    "Edit",
    "btn btn-secondary btn-lg dropdown-toggle",
    `add-site-button-${id}`,
    dropdownProperties
  );
  createDiv(`dropdown-${id}`, "dropdown-menu", `dropdown-menu-${id}`);
  //Div to hold all the days.
  createDiv(`dropdown-${id}`, "week-form", `week-form-${id}`);
  //Adds weekdays.
  for (let index = 0; index < WEEKDAYS.length; index++) {
    createButtonElement(
      `dropdown-menu-${id}`,
      `${capitalize(WEEKDAYS[index])}`,
      `dropdown-item`,
      `${WEEKDAYS[index]}-${id}`
    );
    $(`#${WEEKDAYS[index]}-${id}`).click(function () {
      if (document.getElementById(`${WEEKDAYS[index]}-div-${id}`) == null)
        createWeekday(index, `week-form-${id}`, id);
    });
  }
}

//Create individual days.
function createWeekday(day, parentElement, id = "") {
  //Needed for editting forms.
  const weekday = WEEKDAYS[day];
  let minutes = "";
  let hours = "";
  let blocked = false;

  //Checks if edit forms have information already.
  if (siteList[id]) {
    seconds = siteList[id].time[day].dayLimit;
    hours = Math.floor(seconds / 3600).toString();
    minutes = Math.floor((seconds % 3600) / 60).toString();
    if (seconds == 0) {
      blocked = true;
    } else if (seconds == -1) {
      hours = "";
      minutes = "";
    }
  }
  createWeekdayDiv(parentElement, weekday, id);
  createParagraphElement(
    `${weekday}-div-${id}`,
    `${capitalize(weekday)}`,
    "weekday-text"
  );
  createLabelElement(
    `${weekday}-div-${id}`,
    `${weekday}-hr`,
    "Hours",
    "hr-label"
  );
  createInputElement(
    `${weekday}-div-${id}`,
    "number",
    `${weekday}-hr-${id}`,
    hours,
    "input-time",
    `${weekday}-hr-${id}`,
    "0",
    "23"
  );
  createLabelElement(
    `${weekday}-div-${id}`,
    `${weekday}-min`,
    "Minutes",
    "min-label"
  );
  createInputElement(
    `${weekday}-div-${id}`,
    "number",
    `${weekday}-min-${id}`,
    minutes,
    "input-time",
    `${weekday}-min-${id}`,
    "0",
    "59"
  );
  createLabelElement(
    `${weekday}-div-${id}`,
    `${weekday}-blocked`,
    "Block All Day",
    "checkbox-label"
  );
  createInputElement(
    `${weekday}-div-${id}`,
    "checkbox",
    `${weekday}-blocked-${id}`,
    "",
    "weekday-checkbox",
    `${weekday}-blocked-${id}`
  );
  createButtonElement(
    `${weekday}-div-${id}`,
    "X",
    "remove-weekday-button",
    `remove-${weekday}-${id}`
  );

  //Creates the behavior to remove a weekday.
  createRemoveButtonResponse(weekday, id, parentElement);

  //Validates the new input divs fields.
  validateWeekdayForm(weekday, id);

  //Adds checks for the blocked box.
  if (blocked) {
    $(`#${weekday}-blocked-${id}`).prop("checked", true);
    $(`#${weekday}-hr-${id}`).prop("disabled", true);
    $(`#${weekday}-min-${id}`).prop("disabled", true);
  }
}

//Creates the whole sitelist.
function createSiteList(siteList) {
  for (let index = 0; index < siteList.length; index++) {
    createSite(siteList[index], index);
  }
}

//Creates an individual site.
function createSite(site, id = "") {
  createDiv("sites", "site-div", `site-div-${id}`);
  createParagraphElement(
    `site-div-${id}`,
    site.url,
    "site-names",
    `site-p${id}`
  );
  createButtonElement(
    `site-div-${id}`,
    "Remove",
    "remove-buttons",
    `site-remove-${id}`
  );
  createWeekDropdown(`site-div-${id}`, id);
  //Adds submit button.
  createButtonElement(
    `dropdown-${id}`,
    "Submit Changes",
    "btn btn-secondary btn-lg",
    `submit-edit-${id}`
  );
  //Hides the submit button by default.
  $(`#submit-edit-${id}`).hide();

}

function updateSiteList(siteList) {
  $("#sites").empty();
  createSiteList(siteList);
  createSiteButtonResponse(siteList);
}

//Creates a div.
function createDiv(parentId = "", classTag = "", idTag = "") {
  const parent = document.getElementById(parentId);
  let div = document.createElement("div");
  //Optional parameters.
  if (classTag) div.className = classTag;
  if (idTag) div.id = idTag;
  parent.appendChild(div);
}

//Creates a div specific to the weekday input forms.
function createWeekdayDiv(parentId = "", weekday, id) {
  let div = document.createElement("div");
  div.className = `weekday-div`;
  div.id = `${weekday}-div-${id}`;
  insertWeekday(parentId, div, weekdayToNumber(weekday), id);
}

//Finds the proper place to insert a weekday div.
function insertWeekday(parentId, weekdayDiv, day, id) {
  const parent = document.getElementById(parentId);
  const currentWeekdays = getCurrentWeekdayArray(parent);
  for (let index = 0; index < currentWeekdays.length; index++) {
    if (day < currentWeekdays[index]) {
      parent.insertBefore(
        weekdayDiv,
        document.getElementById(`${WEEKDAYS[currentWeekdays[index]]}-div-${id}`)
      );
      return;
    }
  }
  parent.appendChild(weekdayDiv);
  //Adds the submit button when adding the first element.
  if (currentWeekdays.length == 0) {
    if (document.getElementById(`submit-edit-${id}`)) {
      $(`#submit-edit-${id}`).show();
    }
  }
}

//Returns an array of the weekdays in a div in numerical form.
function getCurrentWeekdayArray(parent) {
  const childNodes = Array.apply(null, parent.childNodes);
  const divRegex = /(\w+)-div-\d*/;
  const filterNodes = childNodes.filter((node) => divRegex.test(node.id));
  return filterNodes.map((node) => weekdayToNumber(divRegex.exec(node.id)[1]));
}

//Creates a text paragraph element.
function createParagraphElement(
  parentId = "",
  innerHTML = "",
  classTag = "",
  idTag = ""
) {
  const parent = document.getElementById(parentId);
  let paragraph = document.createElement("p");
  paragraph.innerHTML = innerHTML;
  //Optional parameters.
  if (classTag) paragraph.className = classTag;
  if (idTag) paragraph.id = idTag;
  parent.appendChild(paragraph);
}

//Creates a button, has additional options for creating more variable buttons.
function createButtonElement(
  parentId = "",
  innerHTML = "",
  classTag = "",
  idTag = "",
  additionalAttributes = []
) {
  const parent = document.getElementById(parentId);
  let button = document.createElement("button");
  button.innerHTML = innerHTML;
  //Optional parameters.
  if (classTag) button.className = classTag;
  if (idTag) button.id = idTag;
  if (additionalAttributes.length > 0) {
    for (let index = 0; index < additionalAttributes.length; index++) {
      button.setAttribute(
        additionalAttributes[index].property,
        additionalAttributes[index].value
      );
    }
  }
  parent.appendChild(button);
}

//Create the necessary label elements.
function createLabelElement(
  parentId = "",
  forTag = "",
  innerHTML = "",
  classTag = "",
  idTag = ""
) {
  const parent = document.getElementById(parentId);
  let label = document.createElement("label");
  label.htmlFor = forTag;
  label.innerHTML = innerHTML;
  //Optional parameters.
  if (classTag) label.className = classTag;
  if (idTag) label.id = idTag;
  parent.appendChild(label);
}

//Create the necessary input elements.
function createInputElement(
  parentId = "",
  type = "",
  name = "",
  value = "",
  classTag = "",
  idTag = "",
  min = "",
  max = ""
) {
  const parent = document.getElementById(parentId);
  let input = document.createElement("input");
  input.type = type;
  input.name = name;
  //Optional parameters.
  if (value) input.value = value;
  if (classTag) input.className = classTag;
  if (idTag) input.id = idTag;
  if (min) input.min = min;
  if (max) input.max = max;
  parent.appendChild(input);
}

//Capitalize the first letter.
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

//Clears the form data.
function resetForm(parentId, id = "") {
  $("#block-site").val("");
  for (let day = 0; day < WEEKDAYS.length; day++) {
    $(`#${WEEKDAYS[day]}-hr-${id}`).val("");
    $(`#${WEEKDAYS[day]}-min-${id}`).val("");
    $(`#${WEEKDAYS[day]}-blocked-${id}`).prop("checked", false);
    $(`#${WEEKDAYS[day]}-hr-${id}`).prop("disabled", false);
    $(`#${WEEKDAYS[day]}-min-${id}`).prop("disabled", false);
  }
  //Removes all the weekday divs.
  const parent = document.getElementById(parentId);
  let weekday = parent.lastChild;
  while (weekday) {
    weekday.remove();
    weekday = parent.lastChild;
  }
  if (document.getElementById(`submit-edit-${id}`)) {
    $(`#submit-edit-${id}`).hide();
  }
}

//Handles incorrect min/max on inputs.
function validateWeekdayForm(weekday, id = "") {
  //Ensures only correct values can be entered.
  $(`#${weekday}-hr-${id}`).keydown(function(event) {
    const keyPress = event.which - 48;
    const val = parseInt($(`#${weekday}-hr-${id}`).val());
    const newVal = (Number.isNaN(val) ? 0 : val) * 10 + keyPress;
    //-40 is backspace.
    if(keyPress == -40) return true;
    //Gets rid of repeated zero presses.
    if(keyPress == 0 && $(`#${weekday}-hr-${id}`).val().length > 0 && val == 0) {
      return false;
    }
    if(keyPress < 0 || keyPress > 9 || newVal < 0 || newVal > 23 ) {
      return false;
    }
  });
  $(`#${weekday}-min-${id}`).keydown(function(event) {
    const keyPress = event.which - 48;
    const val = parseInt($(`#${weekday}-min-${id}`).val());
    const newVal = (Number.isNaN(val) ? 0 : val) * 10 + keyPress;
    //-40 is backspace.
    if(keyPress == -40) return true;
    //Gets rid of repeated zero presses.
    if(keyPress == 0 && $(`#${weekday}-min-${id}`).val().length > 0 && val == 0) {
      return false;
    }
    if(keyPress < 0 || keyPress > 9 || newVal < 0 || newVal > 59 ) {
      return false;
    }
  });

  //Blocked checkbox details.
  $(`#${weekday}-blocked-${id}`).click(function () {
    if ($(`#${weekday}-blocked-${id}`).is(":checked")) {
      $(`#${weekday}-hr-${id}`).prop("disabled", true);
      $(`#${weekday}-min-${id}`).prop("disabled", true);
    } else {
      $(`#${weekday}-hr-${id}`).prop("disabled", false);
      $(`#${weekday}-min-${id}`).prop("disabled", false);
    }
  });
}

//Creates actionable items on siteList
function createSiteButtonResponse(siteList) {
  for (let index = 0; index < siteList.length; index++) {
    $(`#submit-edit-${index}`).click(function () {
      if(pin) {
        requirePin().then(function(result) {
          bkg.console.log(result);
        });
      }
      siteList[index].time = getTimesByWeekday(index);
      chrome.storage.sync.set({ timeList: siteList }, function () {});
      resetForm(`week-form-${index}`, index);
    });
    $(`#site-remove-${index}`).click(function () {
      if(pin) {
        requirePin().then(function(result) {
          bkg.console.log(result);
        });
      }
      chrome.runtime.sendMessage({ unblock: siteList[index].url });
      siteList.splice(index, 1);
      chrome.storage.sync.set({ timeList: siteList }, function () {
        updateSiteList(siteList);
      });
    });
  }
}

//Creates the remove response for removal buttons on weekdays..
function createRemoveButtonResponse(weekday, id = "", parentElement) {
  $(`#remove-${weekday}-${id}`).click(function () {
    //Removes the div for the weekday.
    $(`#${weekday}-div-${id}`).remove();
    //Hides the submit button if no days are displayed.
    if (document.getElementById(parentElement).childNodes.length == 0) {
      if (document.getElementById(`submit-edit-${id}`)) {
        $(`#submit-edit-${id}`).hide();
      }
    }
  });
}

//Checks for duplicate url in the urlTimeArray.
function isInTimeList(urlTimeArray, url) {
  const isDuplicate = (item) => item.url == url;
  return urlTimeArray.some(isDuplicate);
}

//Trims the url to a reasonable setup - e.g. https://facebook.com/GV9?utB_eg2j to www.facebook.com
function trimURL(url) {
  //Regex to trim urls.
  let re = /([a-zA-Z0-9-]*\.)+\w*/;
  let trimmed = re.exec(url);
  //If it is a trimmable url, trim it.
  if (trimmed) {
    return trimmed[0];
  }
  //Otherwise use the raw url.
  else {
    return url;
  }
}

//Converts hours and minutes to seconds.
function convertToSeconds(hours, minutes) {
  return hours * 3600 + minutes * 60;
}

//Converts the weekday string to an index.
function weekdayToNumber(weekday) {
  const day = weekday.toLowerCase();
  switch (day) {
    case "sunday":
      return 0;
    case "monday":
      return 1;
    case "tuesday":
      return 2;
    case "wednesday":
      return 3;
    case "thursday":
      return 4;
    case "friday":
      return 5;
    case "saturday":
      return 6;
    default:
      return -1;
  }
}

//I put it into a function for if I want to make it so that users can individually select days, rather than see a whole form at once.
function createWeek(parentElement, id = "") {
  for (let day = 0; day < WEEKDAYS.length; day++) {
    createWeekday(day, parentElement, id);
  }
}
