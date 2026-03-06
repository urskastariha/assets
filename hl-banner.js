(function () {
  "use strict";

  function getBannerIframe() {
    return document.querySelector(".iframe-wrapper iframe");
  }

  function postToIframe(message) {
    var iframe = getBannerIframe();

    if (!iframe) {
      console.warn("[hl-banner] Banner iframe not found.");
      return false;
    }

    if (!iframe.contentWindow) {
      console.warn("[hl-banner] Banner iframe has no contentWindow.");
      return false;
    }

    iframe.contentWindow.postMessage(message, "*");
    return true;
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  }

  function setText(selector, value) {
    var el = qs(selector);
    if (el) el.textContent = value != null ? value : "";
  }

  function setHtml(selector, value) {
    var el = qs(selector);
    if (el) el.innerHTML = value != null ? value : "";
  }

  function addClass(selector, className) {
    var el = qs(selector);
    if (el) el.classList.add(className);
  }

  function removeClass(selector, className) {
    var el = qs(selector);
    if (el) el.classList.remove(className);
  }

  function formatDateLabel(dateString) {
    try {
      var date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("sl-SI", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  function clearSlots() {
    var slotsContainer = qs(".available-slots, .slots-list, .calendar-slots");
    if (slotsContainer) {
      slotsContainer.innerHTML = "";
    }
  }

  function renderSlots(slots) {
    var slotsContainer = qs(".available-slots, .slots-list, .calendar-slots");

    if (!slotsContainer) {
      console.warn("[hl-banner] Slots container not found.");
      return;
    }

    slotsContainer.innerHTML = "";

    if (!Array.isArray(slots) || !slots.length) {
      slotsContainer.innerHTML =
        '<div class="no-slots-message">Ni prostih terminov.</div>';
      return;
    }

    slots.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "slot-button";
      button.textContent =
        slot.label ||
        slot.time ||
        slot.display ||
        formatDateLabel(slot.datetime || slot.date) ||
        "Termin";

      button.addEventListener("click", function () {
        qsa(".slot-button.is-active").forEach(function (el) {
          el.classList.remove("is-active");
        });
        button.classList.add("is-active");

        postToIframe({
          type: "selectSlot",
          slot: slot,
        });
      });

      slotsContainer.appendChild(button);
    });
  }

  function updateDropdownValue(dropdownName, value, label) {
    var target = qs(
      '[data-dropdown="' + dropdownName + '"] .dropdown-current,' +
        ' [data-dropdown="' + dropdownName + '"] .custom-dropdown__selected,' +
        ' [data-dropdown="' + dropdownName + '"] .selected-value'
    );

    if (target) {
      target.textContent = label || value || "";
    }

    var hiddenInput = qs(
      'input[name="' + dropdownName + '"], input[data-name="' + dropdownName + '"]'
    );

    if (hiddenInput) {
      hiddenInput.value = value || "";
    }
  }

  function closeAllDropdowns() {
    qsa(".custom-dropdown.is-open, .custom-dropdown.open").forEach(function (el) {
      el.classList.remove("is-open");
      el.classList.remove("open");
    });
  }

  function initDropdowns() {
    var dropdowns = qsa(".custom-dropdown");

    dropdowns.forEach(function (dropdown) {
      var trigger =
        qs(".custom-dropdown__trigger", dropdown) ||
        qs(".dropdown-current", dropdown) ||
        qs(".selected-value", dropdown) ||
        dropdown;

      var options = qsa(
        ".custom-dropdown__option, .dropdown-option, [data-dropdown-option]",
        dropdown
      );

      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var isOpen =
          dropdown.classList.contains("is-open") ||
          dropdown.classList.contains("open");

        closeAllDropdowns();

        if (!isOpen) {
          dropdown.classList.add("is-open");
          dropdown.classList.add("open");
        }
      });

      options.forEach(function (option) {
        option.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();

          var value =
            option.getAttribute("data-value") ||
            option.dataset.value ||
            option.textContent.trim();

          var label =
            option.getAttribute("data-label") ||
            option.dataset.label ||
            option.textContent.trim();

          var dropdownName =
            dropdown.getAttribute("data-dropdown") ||
            dropdown.dataset.dropdown ||
            dropdown.getAttribute("data-name") ||
            dropdown.dataset.name;

          updateDropdownValue(dropdownName, value, label);

          dropdown.classList.remove("is-open");
          dropdown.classList.remove("open");

          postToIframe({
            type: "dropdownChange",
            dropdown: dropdownName,
            value: value,
            label: label,
          });
        });
      });
    });

    document.addEventListener("click", function () {
      closeAllDropdowns();
    });
  }

  function requestPreviousWeek(weekStart) {
    var date = new Date(weekStart);
    if (isNaN(date.getTime())) return;

    date.setDate(date.getDate() - 7);

    postToIframe({
      type: "requestWeek",
      weekStart: date.toISOString(),
    });
  }

  function requestNextWeek(weekStart) {
    var date = new Date(weekStart);
    if (isNaN(date.getTime())) return;

    date.setDate(date.getDate() + 7);

    postToIframe({
      type: "requestWeek",
      weekStart: date.toISOString(),
    });
  }

  function initWeekNavigation() {
    var prevBtn = qs(".calendar-prev, .week-prev, [data-calendar-prev]");
    var nextBtn = qs(".calendar-next, .week-next, [data-calendar-next]");

    if (prevBtn) {
      prevBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var currentWeekStart =
          document.body.getAttribute("data-current-week-start") ||
          new Date().toISOString();
        requestPreviousWeek(currentWeekStart);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var currentWeekStart =
          document.body.getAttribute("data-current-week-start") ||
          new Date().toISOString();
        requestNextWeek(currentWeekStart);
      });
    }
  }

  function handleIframeMessage(event) {
    if (!event || !event.data || typeof event.data !== "object") return;

    var data = event.data;

    switch (data.type) {
      case "iframe_ready":
      case "banner_ready":
        postToIframe({ type: "parent_ready" });
        break;

      case "set_week":
      case "week_data":
        if (data.weekStart) {
          document.body.setAttribute("data-current-week-start", data.weekStart);
        }

        if (data.label) {
          setText(
            ".calendar-week-label, .week-label, [data-calendar-label]",
            data.label
          );
        }
        break;

      case "slots_data":
      case "set_slots":
        renderSlots(data.slots || []);
        break;

      case "selected_date":
        setText(
          ".selected-date-label, .date-label, [data-selected-date]",
          data.label || formatDateLabel(data.date)
        );
        break;

      case "update_dropdown":
        if (data.dropdown) {
          updateDropdownValue(data.dropdown, data.value, data.label);
        }
        break;

      case "loading_start":
        addClass(".iframe-wrapper", "is-loading");
        break;

      case "loading_end":
        removeClass(".iframe-wrapper", "is-loading");
        break;

      case "clear_slots":
        clearSlots();
        break;

      case "debug":
        console.log("[hl-banner iframe debug]", data.payload || data);
        break;

      default:
        break;
    }
  }

  function initIframeLoad() {
    var iframe = getBannerIframe();

    if (!iframe) {
      console.warn("[hl-banner] No iframe found inside .iframe-wrapper");
      return;
    }

    iframe.addEventListener("load", function () {
      postToIframe({ type: "parent_ready" });
    });
  }

  function init() {
    if (!getBannerIframe()) {
      console.warn("[hl-banner] Init skipped: iframe missing.");
      return;
    }

    initDropdowns();
    initWeekNavigation();
    initIframeLoad();

    window.addEventListener("message", handleIframeMessage, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
