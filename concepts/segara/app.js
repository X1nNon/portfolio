const form = document.querySelector("#road-form");
const length = document.querySelector("#length");
const width = document.querySelector("#width");
const locationField = document.querySelector("#location");
const conditionField = document.querySelector("#condition");
const area = document.querySelector("#area");
const areaLine = document.querySelector("#area-line");
const areaEmpty = document.querySelector("#area-empty");
const lengthMeasure = document.querySelector("#measure-length");
const widthMeasure = document.querySelector("#measure-width");
const message = document.querySelector("#message");
const messageText = document.querySelector("#message-text");
const copyButton = document.querySelector("#copy-message");
const copyStatus = document.querySelector("#copy-status");
const format = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 4 });
const map = document.querySelector(".map-plate");
const pins = map.querySelectorAll(".pin");
const useScenario = document.querySelector("#use-scenario");

for (const pin of pins) {
  pin.addEventListener("click", () => {
    map.dataset.active = pin.dataset.scenario;
    for (const option of pins) {
      const active = option === pin;
      option.setAttribute("aria-pressed", String(active));
      document.getElementById(option.getAttribute("aria-controls")).hidden = !active;
    }
  });
}

useScenario.addEventListener("click", () => {
  conditionField.value = map.dataset.active;
  clearMessage();
});

function clearMessage() {
  message.hidden = true;
  copyStatus.textContent = "";
}

function readDimension(input) {
  const value = Number(input.value.replace(",", "."));
  const valid = input.value !== "" && !input.validity.patternMismatch && Number.isFinite(value) && value > 0 && value <= 100000;
  if (valid || input.value === "") {
    input.removeAttribute("aria-invalid");
  } else {
    input.setAttribute("aria-invalid", "true");
  }
  input.setCustomValidity(valid || input.value === "" ? "" : "Укажите число от 0,01 до 100 000. Можно использовать запятую.");
  return valid ? value : null;
}

function updateEstimate() {
  const meters = readDimension(length);
  const cross = readDimension(width);
  const surface = meters !== null && cross !== null ? meters * cross : null;
  area.value = surface === null ? "" : format.format(surface);
  areaLine.hidden = surface === null;
  areaEmpty.hidden = surface !== null;
  lengthMeasure.textContent = meters === null ? "Длина" : format.format(meters) + " м";
  widthMeasure.textContent = cross === null ? "Ширина" : format.format(cross) + " м";
  return { meters, cross, surface };
}

form.addEventListener("input", () => {
  updateEstimate();
  clearMessage();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const { meters, cross, surface } = updateEstimate();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const location = locationField.value.trim();
  const text = ["Здравствуйте! Хочу узнать стоимость дороги из асфальтовой крошки."];
  if (location) text.push("Посёлок или адрес: " + location);
  if (conditionField.value) {
    text.push("Состояние проезда: " + conditionField.selectedOptions[0].textContent.toLowerCase() + ".");
  }
  if (meters !== null) text.push("Длина " + format.format(meters) + " м.");
  if (cross !== null) text.push("Ширина " + format.format(cross) + " м.");
  if (surface !== null) text.push("Ориентировочная площадь " + format.format(surface) + " м².");
  messageText.value = text.join("\n");
  message.hidden = false;
  copyStatus.textContent = "";
  messageText.focus();
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(messageText.value);
    copyStatus.textContent = "Текст скопирован.";
  } catch {
    messageText.focus();
    messageText.select();
    copyStatus.textContent = "Текст выделен. Скопируйте его вручную.";
  }
});

updateEstimate();
