//GLOBAL VARIABLES
let siteList = [];
let pin = "";

// ? Stats tab time spent on each site.
// TODO Convert old "input" checkboxes into buttons
// TODO Make sure button size stays the same from enabled -> disabled.

//! FOR DEBUGGING
const bkg = chrome.extension.getBackgroundPage();

$(function () {
  //Gets necessary global variables from storage.
  chrome.storage.sync.get(["urlList", "pin", "timeMinimized"], function (items) {
    siteList = items.urlList;
    pin = items.pin;
    minimized = items.timeMinimized;
    //TODO Updates the status of the pin/minimized button.
    alignSettingButtonState(`parental-control-button`, pin);
    alignSettingButtonState(`minimized-button`, minimized);

    //Updates the site list page.
    updateSiteList(siteList);
  });

  //On submission, reset the form and send the data to the background script.
  $("#submit-button").click(function () {
    let url = $("#block-site").val();
    if (url) {
      //Store the given url if it is not a duplicated.
      url = url.toLowerCase();
      if (validUrl(url)) {
        chrome.storage.sync.get(["urlList"], function (items) {
          let list = items.urlList;
          storeTimeList(list, url);
          resetForm("week-form-");
        });
      } else {
        alert("Invalid URL format!");
      }
    } else {
      alert("No URL submitted!");
    }
  });

  //Reset the form
  $("#reset-button").click(function () {
    resetForm("week-form-");
  });

  //Hides the other page divs, shows the clicked div.
  for (let index = 0; index < DIVS.length; index++) {
    $(`#${DIVS[index]}-tag`).click(function () {
      showDiv(`${DIVS[index]}`);
    });
  }

  //The select-all button functionality for the add-site form.
  $("#select-all-").click(function () {
    const selectAll = $(`#select-all-`).attr("aria-pressed");
    if (selectAll == "false") {
      selectAllWeekdayValues();
    } else {
      turnSelectAllOff();
    }
  });

  //Validates the weekday form for the add-site div.
  for (let day = 0; day < WEEKDAYS.length; day++) {
    validateWeekdayForm(WEEKDAYS[day]);
  }

  //Minimized form options.
  $(`#minimized-button`).click(function () {
    chrome.storage.sync.get("timeMinimized", function(items) {
      const minimized = items.timeMinimized;
      alignSettingButtonState(`minimized-button`, !minimized);
      chrome.storage.sync.set({ timeMinimized: !minimized }, function () {
        //! ERROR CATCH
        var error = chrome.runtime.lastError;
        if (error) {
          bkg.console.log(error);
        }
      });
    });
  });

  //Display the proper modal for the parental control checkbox.
  $(`#parental-control-button`).click(function () {
    if (!pin) {
      $(`#add-pin`).modal("show");
    }
    else {
      $("#remove-pin").modal("show");
    }
  });

  //Save button on the add pin modal.
  $(`#save-pin-button`).click(function () {
    enablePin();
  });

  //Behavior when cancelling add pin modal.
  $(`#cancel-pin-button`).click(function () {
    clearAddPin();
  });

  //Removing the pin behavior.
  $(`#remove-pin-button`).click(function () {
    disablePin();
  });

  //Cancels changes to the remove pin.
  $(`#cancel-remove-button`).click(function () {
    $(`#remove-pin-input`).val("");
  });

  //Blocks user from entering non-numeric digits.
  $(`#initial-pin`).keydown(function (event) {
    const keyPress = event.which - 48;
    //-40 is backspace.
    if ((keyPress < 0 || keyPress > 9) && keyPress != -40) {
      return false;
    }
  });
  $(`#confirm-pin`).keydown(function (event) {
    const keyPress = event.which - 48;
    //-40 is backspace.
    if ((keyPress < 0 || keyPress > 9) && keyPress != -40) {
      return false;
    }
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

//Clears the add pin modal inputs.
function clearAddPin() {
  $(`#initial-pin`).val("");
  $(`#confirm-pin`).val("");
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
    chrome.storage.sync.set({ urlList: urlTimeArray }, function () {
      updateSiteList(siteList);
      //! ERROR CATCH
      var error = chrome.runtime.lastError;
      if (error) {
        bkg.console.log(error);
      }
    });
  }
}

//Function to enable the pin.
function enablePin() {
  const initialPin = $(`#initial-pin`).val();
  const confirmPin = $(`#confirm-pin`).val();
  if (
    Number.isInteger(parseInt(initialPin)) &&
    confirmPin == initialPin &&
    initialPin.length == 4
  ) {
    pin = initialPin;
    chrome.storage.sync.set({ pin: pin }, function () {
      $("#add-pin").modal("hide");
      alignSettingButtonState(`parental-control-button`, true);
      clearAddPin();
    });
  } else {
    bkg.console.log("EPIC FAIL");
  }
}

//Function to disable the pin.
function disablePin() {
  if (pin == $(`#remove-pin-input`).val()) {
    pin = "";
    chrome.storage.sync.set({ pin: pin }, function () {
      $("#remove-pin").modal("hide");
      $("#remove-pin-input").val("");
      alignSettingButtonState(`parental-control-button`, false);
    });
  } else {
    bkg.console.log("EPIC FAIL");
  }
}

//Ensures the alignement of parental control settings.
function alignSettingButtonState(selector, state) {
  const enabledStatus = state ? "Enabled" : "Disabled";
  $(`#${selector}`).html(enabledStatus);
}

//Returns a formatted version of the form information for the inputs regarding the block time per day.
function getTimesByWeekday(id = "") {
  let weekdayTimes = [];
  for (let day = 0; day < WEEKDAYS.length; day++) {
    if (document.getElementById(`${WEEKDAYS[day]}-div-${id}`) == null) {
      weekdayTimes.push({
        limit: Number.isInteger(id) ? siteList[id].time[day].limit : -1,
      });
    } else if ($(`#${WEEKDAYS[day]}-blocked-${id}`).attr("aria-pressed") == "true") {
      weekdayTimes.push({ limit: 0 });
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
        limit: seconds,
      });
    }
  }
  return weekdayTimes;
}

//Creates the dropdown menu for selecting weekdays.
function createWeekDropdown(id = "") {
  const dropdownProperties = [
    { property: "data-toggle", value: "dropdown" },
    { property: "aria-haspopup", value: "true" },
    { property: "aria-expanded", value: "false" },
  ];
  const selectProperties = [
    { property: "data-toggle", value: "button" },
    { property: "aria-pressed", value: "false" },
  ];
  createButtonElement(
    `dropdown-${id}`,
    pencilPath,
    "btn dropdown-toggle dropdown-button site-button",
    `add-site-button-${id}`,
    dropdownProperties
  );
  createDiv(`dropdown-${id}`, "dropdown-menu", `dropdown-menu-${id}`);
  //Div to hold all the days.
  createDiv(`dropdown-${id}`, "week-form", `week-form-${id}`);
  //Button to select all the days at once.
  createButtonElement(
    `week-form-${id}`,
    "Select All Below",
    "btn btn-primary btn-sm select-all-button",
    `select-all-${id}`,
    selectProperties
  );
  $(`#select-all-${id}`).hide();
  //Selects all the below days.
  $(`#select-all-${id}`).click(function () {
    //Toggle select-all.
    const selectAll = $(`#select-all-${id}`).attr("aria-pressed");
    if (selectAll == "false") {
      selectAllWeekdayValues(id);
    } else {
      turnSelectAllOff(id);
    }
  });
  //Adds weekdays.
  for (let index = 0; index < WEEKDAYS.length; index++) {
    createButtonElement(
      `dropdown-menu-${id}`,
      `${capitalize(WEEKDAYS[index])}`,
      `dropdown-item menu-button`,
      `${WEEKDAYS[index]}-${id}`
    );
    $(`#${WEEKDAYS[index]}-${id}`).click(function () {
      if (document.getElementById(`${WEEKDAYS[index]}-div-${id}`) == null)
        createWeekday(index, `week-form-${id}`, id);
    });
  }
  //Button to show all days.
  // TODO Make this button colored red.
  createButtonElement(
    `dropdown-menu-${id}`,
    `Show All Days`,
    `dropdown-item menu-button show-all-button`,
    `show-all-${id}`
  );
  $(`#show-all-${id}`).click(function () {
    unfoldWeekdays(id);
  });
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
    seconds = siteList[id].time[day].limit;
    hours = Math.floor(seconds / 3600).toString();
    minutes = Math.floor((seconds % 3600) / 60).toString();
    if (seconds == 0) {
      blocked = true;
    } else if (seconds == -1) {
      hours = "";
      minutes = "";
    }
  }

  const blockProperties = [
    { property: "data-toggle", value: "button" },
    { property: "aria-pressed", value: blocked.toString() },
  ];

  createWeekdayDiv(parentElement, weekday, id);
  createHeaderElement(
    `${weekday}-div-${id}`,
    `${capitalize(weekday)}`,
    6,
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
  createButtonElement(
    `${weekday}-div-${id}`,
    "Block",
    "btn btn-danger block-button",
    `${weekday}-blocked-${id}`,
    blockProperties
  );
  createAnchorElement(
    `${weekday}-div-${id}`,
    XPath,
    "remove-weekday-button",
    `remove-${weekday}-${id}`
  );

  //Creates behavior to enact select all on the weekday.
  const selectAll = $(`#select-all-${id}`).attr("aria-pressed");
  if (selectAll == "true") selectAllWeekdayValues(id);

  //Creates the behavior to remove a weekday.
  createRemoveButtonResponse(weekday, id, parentElement);

  //Validates the new input divs fields.
  validateWeekdayForm(weekday, id);

  //Toggles blocked button.
  alignAriaPressed(`${weekday}-blocked-${id}`, blocked);
  $(`#${weekday}-hr-${id}`).prop("disabled", blocked);
  $(`#${weekday}-min-${id}`).prop("disabled", blocked);
}

//Shows all the weekday divs,
function unfoldWeekdays(id = "") {
  for (let index = 0; index < WEEKDAYS.length; index++) {
    if (document.getElementById(`${WEEKDAYS[index]}-div-${id}`) == null)
      createWeekday(index, `week-form-${id}`, id);
  }
}

//Selects all the values in a list.
function selectAllWeekdayValues(id = "") {
  //Updates the values on changed to simulate all changing at once.
  for (let index = 0; index < WEEKDAYS.length; index++) {
    $(`#${WEEKDAYS[index]}-hr-${id}`)
      .off("change")
      .on("change", function () {
        const changedVal = $(`#${WEEKDAYS[index]}-hr-${id}`).val();
        for (let day = 0; day < WEEKDAYS.length; day++) {
          if (
            document.getElementById(`${WEEKDAYS[day]}-hr-${id}`) &&
            index != day
          ) {
            $(`#${WEEKDAYS[day]}-hr-${id}`).val(changedVal);
          }
        }
      });
    //Synchronized min value.
    $(`#${WEEKDAYS[index]}-min-${id}`)
      .off("change")
      .on("change", function () {
        const changedVal = $(`#${WEEKDAYS[index]}-min-${id}`).val();
        for (let day = 0; day < WEEKDAYS.length; day++) {
          if (
            document.getElementById(`${WEEKDAYS[day]}-min-${id}`) &&
            index != day
          ) {
            $(`#${WEEKDAYS[day]}-min-${id}`).val(changedVal);
          }
        }
      });
    //Synchronized block all day checkbox.
    $(`#${WEEKDAYS[index]}-blocked-${id}`)
      .off("click")
      .on("click", function () {
        const isChecked = $(`#${WEEKDAYS[index]}-blocked-${id}`).attr('aria-pressed') == 'true';
        $(`#${WEEKDAYS[index]}-hr-${id}`).prop("disabled", !isChecked);
        $(`#${WEEKDAYS[index]}-min-${id}`).prop("disabled", !isChecked);
        for (let day = 0; day < WEEKDAYS.length; day++) {
          const modifyDay = document.getElementById(
            `${WEEKDAYS[day]}-blocked-${id}`
          );
          if (modifyDay && index != day) {
            alignAriaPressed(`${WEEKDAYS[day]}-blocked-${id}`, !isChecked);
            $(`#${WEEKDAYS[day]}-hr-${id}`).prop("disabled", !isChecked);
            $(`#${WEEKDAYS[day]}-min-${id}`).prop("disabled", !isChecked);
          }
        }
      });
  }
}

//Turns the select all off.
function turnSelectAllOff(id = "") {
  for (let index = 0; index < WEEKDAYS.length; index++) {
    $(`#${WEEKDAYS[index]}-hr-${id}`).off("change");
    $(`#${WEEKDAYS[index]}-min-${id}`).off("change");
    $(`#${WEEKDAYS[index]}-blocked-${id}`).off("click").on("click", function() {
      const isChecked = $(`#${WEEKDAYS[index]}-blocked-${id}`).attr('aria-pressed') == 'true';
      $(`#${WEEKDAYS[index]}-blocked-${id}`).prop("aria-pressed", (!isChecked).toString());
      $(`#${WEEKDAYS[index]}-hr-${id}`).prop("disabled", !isChecked);
      $(`#${WEEKDAYS[index]}-min-${id}`).prop("disabled", !isChecked);
    });
  }
}

//Aligns the press state for aria buttons.
function alignAriaPressed(selector, state) {
  if($(`#${selector}`).attr("aria-pressed") == (!state).toString()) {
    $(`#${selector}`).button('toggle');
    $(`#${selector}`).prop("aria-pressed", state);
  }
}

//Updates the site list HTML segment.
function updateSiteList(siteList) {
  $("#sites").empty();
  createSiteList(siteList);
  createSiteButtonResponse(siteList);
}

//Creates the whole sitelist.
function createSiteList(siteList) {
  for (let index = 0; index < siteList.length; index++) {
    createSite(siteList[index], index);
  }
}

//Creates an individual site.
function createSite(site, id = "") {
  //Dropdown div.
  createDiv(`sites`, "dropdown dropdown-div", `dropdown-${id}`);
  createAnchorElement(
    `dropdown-${id}`,
    trashPath,
    "site-button btn remove-button",
    `site-remove-${id}`
  );
  createHeaderElement(`dropdown-${id}`, site.url, 6, "site-name");
  createWeekDropdown(id);
  //Adds the cancel button.
  createAnchorElement(
    `dropdown-${id}`,
    chevronPath,
    "btn form-anchor",
    `cancel-edit-${id}`
  );
  //Adds submit button.
  createAnchorElement(
    `dropdown-${id}`,
    checkPath,
    "btn form-anchor",
    `submit-edit-${id}`
  );
  //Hides the submit/cancel button by default.
  $(`#submit-edit-${id}`).hide();
  $(`#cancel-edit-${id}`).hide();
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
      $(`#cancel-edit-${id}`).show();
    }
    if (document.getElementById(`select-all-${id}`)) {
      $(`#select-all-${id}`).show();
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

//Creates a text header element.
function createHeaderElement(
  parentId = "",
  innerHTML = "",
  headerNumber = 1,
  classTag = "",
  idTag = ""
) {
  const parent = document.getElementById(parentId);
  let header = document.createElement(`h${headerNumber}`);
  header.innerHTML = innerHTML;
  //Optional parameters.
  if (classTag) header.className = classTag;
  if (idTag) header.id = idTag;
  parent.appendChild(header);
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

//Creates an anchor attribute, has additional options for creating more variable buttons.
function createAnchorElement(
  parentId = "",
  innerHTML = "",
  classTag = "",
  idTag = "",
  additionalAttributes = []
) {
  const parent = document.getElementById(parentId);
  let a = document.createElement("a");
  a.innerHTML = innerHTML;
  //Optional parameters.
  if (classTag) a.className = classTag;
  if (idTag) a.id = idTag;
  if (additionalAttributes.length > 0) {
    for (let index = 0; index < additionalAttributes.length; index++) {
      a.setAttribute(
        additionalAttributes[index].property,
        additionalAttributes[index].value
      );
    }
  }
  parent.appendChild(a);
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
    //Turn the blocked button back to normal.
    alignAriaPressed(`${WEEKDAYS[day]}-blocked-${id}`, false);
    $(`#${WEEKDAYS[day]}-hr-${id}`).prop("disabled", false);
    $(`#${WEEKDAYS[day]}-min-${id}`).prop("disabled", false);
  }

  //Current precaution for the way the weeks are being setup, remove if I want to dynamically generate add-site.
  const select = $(`#select-all-${id}`).attr("aria-pressed");
  if(select == 'true') {
    $(`#select-all-${id}`).button('toggle');
    $(`#select-all-${id}`).prop('aria-pressed', 'false');
    turnSelectAllOff(id);
  }
  if (id === "") {
    return;
  }
  //Removes all the weekday divs.
  const parent = document.getElementById(parentId);
  let weekday = parent.lastChild;
  while (weekday) {
    //Stops the select all button from being deleted.
    if (weekday.id == `select-all-${id}`) {
      $(`#${weekday.id}`).hide();
      break;
    }
    weekday.remove();
    weekday = parent.lastChild;
  }
  if (document.getElementById(`submit-edit-${id}`)) {
    $(`#submit-edit-${id}`).hide();
  }
  if (document.getElementById(`cancel-edit-${id}`)) {
    $(`#cancel-edit-${id}`).hide();
  }
}

//Handles incorrect min/max on inputs.
function validateWeekdayForm(weekday, id = "") {
  //Ensures only correct values can be entered.
  $(`#${weekday}-hr-${id}`).keydown(function (event) {
    const keyPress = event.which - 48;
    const val = parseInt($(`#${weekday}-hr-${id}`).val());
    const newVal = (Number.isNaN(val) ? 0 : val) * 10 + keyPress;
    //Allows for tab, backspace and left and right arrows.
    if (keyPress == -40 || keyPress == -39 || keyPress == -11 || keyPress == -9)
      return true;
    //Gets rid of repeated zero presses.
    if (
      keyPress == 0 &&
      $(`#${weekday}-hr-${id}`).val().length > 0 &&
      val == 0
    ) {
      return false;
    }
    if (keyPress < 0 || keyPress > 9 || newVal < 0 || newVal > 23) {
      return false;
    }
  });
  $(`#${weekday}-min-${id}`).keydown(function (event) {
    const keyPress = event.which - 48;
    const val = parseInt($(`#${weekday}-min-${id}`).val());
    const newVal = (Number.isNaN(val) ? 0 : val) * 10 + keyPress;
    //-40 is backspace.
    if (keyPress == -40 || keyPress == -39 || keyPress == -11 || keyPress == -9)
      return true;
    //Gets rid of repeated zero presses.
    if (
      keyPress == 0 &&
      $(`#${weekday}-min-${id}`).val().length > 0 &&
      val == 0
    ) {
      return false;
    }
    if (keyPress < 0 || keyPress > 9 || newVal < 0 || newVal > 59) {
      return false;
    }
  });

  //Blocked checkbox details.
  $(`#${weekday}-blocked-${id}`).click(function () {
    const block = $(`#${weekday}-blocked-${id}`).attr('aria-pressed') == 'true';
    $(`#${weekday}-hr-${id}`).prop("disabled", !block);
    $(`#${weekday}-min-${id}`).prop("disabled", !block);
  });
}

//Creates actionable items on siteList
function createSiteButtonResponse(siteList) {
  for (let index = 0; index < siteList.length; index++) {
    //For the button to submit changes to an editted site.
    $(`#submit-edit-${index}`).click(function () {
      if (pin) {
        requirePin().then(async function (result) {
          while (result == "wrong") {
            result = await clickSave();
          }
          if (result == "correct") {
            editSite(index);
          } else if (result == "cancel") {
            $(`#require-pin`).modal("hide");
          }
        });
      } else {
        editSite(index);
      }
    });
    //For the cancel the changes button.
    $(`#cancel-edit-${index}`).click(function() {
      resetForm(`week-form-${index}`, index);
    });
    //To remove a site from the list of limited sites.
    $(`#site-remove-${index}`).click(function () {
      if (pin) {
        requirePin().then(async function (result) {
          while (result == "wrong") {
            result = await clickSave();
          }
          if (result == "correct") {
            removeSite(index);
          } else if (result == "cancel") {
            $(`#require-pin`).modal("hide");
          }
        });
      } else {
        removeSite(index);
      }
    });
  }
}

//Require PIN
async function requirePin() {
  $(`#require-pin`).modal("show");
  return await clickSave();
}

//Function to return a promise from the PIN modal.
function clickSave() {
  //Controls the pin modal, returns it as a promise to fulfill.
  return new Promise((resolve, reject) => {
    $(`#save-changes-button`)
      .off("click")
      .on("click", function () {
        if (pin == $(`#enter-pin`).val()) {
          $(`#require-pin`).modal("hide");
          $(`#enter-pin`).val("");
          resolve("correct");
        } else {
          $(`#enter-pin`).val("");
          resolve("wrong");
        }
      });

    $(`#cancel-changes-button`)
      .off("click")
      .on("click", function () {
        $(`#require-pin`).modal("hide");
        $(`#enter-pin`).val("");
        resolve("cancel");
      });
  });
}

//Edits a site's restrictions given its index.
//TODO CHECK THAT THE getTimesByWeekday method works as intended.
function editSite(index) {
  siteList[index].time = getTimesByWeekday(index, true);
  chrome.storage.sync.set({ urlList: siteList }, function () {
    //! ERROR CATCH
    var error = chrome.runtime.lastError;
    if (error) {
      bkg.console.log(error);
    }
  });
  resetForm(`week-form-${index}`, index);
}

//Removes a site from the watchlist. given the index.
function removeSite(index) {
  chrome.runtime.sendMessage({ unblock: siteList[index].url });
  siteList.splice(index, 1);
  chrome.storage.sync.set({ urlList: siteList }, function () {
    updateSiteList(siteList);

    //! ERROR CATCH
    var error = chrome.runtime.lastError;
    if (error) {
      bkg.console.log(error);
    }
  });
}

//Creates the remove response for removal buttons on weekdays..
function createRemoveButtonResponse(weekday, id = "", parentElement) {
  $(`#remove-${weekday}-${id}`).click(function () {
    //Removes the div for the weekday.
    $(`#${weekday}-div-${id}`).remove();
    //Hides the submit button if no days are displayed.
    if (document.getElementById(parentElement).childNodes.length == 1) {
      if (document.getElementById(`submit-edit-${id}`)) {
        $(`#submit-edit-${id}`).hide();
      }
      if (document.getElementById(`cancel-edit-${id}`)) {
        $(`#cancel-edit-${id}`).hide();
      }
      if (document.getElementById(`select-all-${id}`)) {
        $(`#select-all-${id}`).hide();
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

//Checks if the url is a valid for blocking url.
function validUrl(url) {
  const validStart = /^[a-zA-Z0-9]/;
  const validEnd = /[a-zA-Z0-9.~?_]$/;
  const invalidCharacters = /[^a-zA-Z0-9.~?/_]/;
  const noDoubleSlash = /(\/\/)+/;
  return (
    !invalidCharacters.test(url) &&
    validEnd.test(url) &&
    validStart.test(url) &&
    !noDoubleSlash.test(url)
  );
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

//CONSTANTS
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
const chevronPath = `<svg width="1.5em" height="1.5em" viewBox="0 0 16 16" class="bi bi-chevron-double-up" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" d="M7.646 2.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 3.707 2.354 9.354a.5.5 0 1 1-.708-.708l6-6z"/>
<path fill-rule="evenodd" d="M7.646 6.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 7.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
</svg>`;
const removePath = `<svg width="1.5em" height="1.5em" viewBox="0 0 16 16" class="bi bi-x-circle-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-4.146-3.146a.5.5 0 0 0-.708-.708L8 7.293 4.854 4.146a.5.5 0 1 0-.708.708L7.293 8l-3.147 3.146a.5.5 0 0 0 .708.708L8 8.707l3.146 3.147a.5.5 0 0 0 .708-.708L8.707 8l3.147-3.146z"/>
</svg>`;
const trashPath = `<svg width="1.5em" height="1.5em" viewBox="0 0 16 16" class="bi bi-trash" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
<path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
</svg>`;
const pencilPath = `<svg width="1.5em" height="1.5em" viewBox="0 0 16 16" class="bi bi-pencil" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" d="M11.293 1.293a1 1 0 0 1 1.414 0l2 2a1 1 0 0 1 0 1.414l-9 9a1 1 0 0 1-.39.242l-3 1a1 1 0 0 1-1.266-1.265l1-3a1 1 0 0 1 .242-.391l9-9zM12 2l2 2-9 9-3 1 1-3 9-9z"/>
<path fill-rule="evenodd" d="M12.146 6.354l-2.5-2.5.708-.708 2.5 2.5-.707.708zM3 10v.5a.5.5 0 0 0 .5.5H4v.5a.5.5 0 0 0 .5.5H5v.5a.5.5 0 0 0 .5.5H6v-1.5a.5.5 0 0 0-.5-.5H5v-.5a.5.5 0 0 0-.5-.5H3z"/>
</svg>`;
const checkPath = `<svg width="1.5em" height="1.5em" viewBox="0 0 16 16" class="bi bi-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/>
</svg>`;
const XPath = `<svg width="1.5em" height="1.5em" viewBox="0 0 16 16" class="bi bi-x-square-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2zm9.854 4.854a.5.5 0 0 0-.708-.708L8 7.293 4.854 4.146a.5.5 0 1 0-.708.708L7.293 8l-3.147 3.146a.5.5 0 0 0 .708.708L8 8.707l3.146 3.147a.5.5 0 0 0 .708-.708L8.707 8l3.147-3.146z"/>
</svg>`;
