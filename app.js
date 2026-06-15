const screens = {
  home: document.querySelector("#homeScreen"),
  question: document.querySelector("#questionScreen"),
  loading: document.querySelector("#loadingScreen"),
  result: document.querySelector("#resultScreen"),
};

const numberForm = document.querySelector("#numberForm");
const numberInput = document.querySelector("#numberInput");
const numberCount = document.querySelector("#numberCount");
const inputError = document.querySelector("#inputError");
const resultMessage = document.querySelector("#resultMessage");
const shareStatus = document.querySelector("#shareStatus");

const decks = {};
let currentDeck = [];
let currentMessage = "";
let currentTopic = "";

const topicSettings = {
  angels: {
    label: "Die Engel sprechen",
    file: "engel-karten-1000.json",
  },
  love: {
    label: "Liebe",
    file: "liebe-karten-1000.json",
  },
  career: {
    label: "Beruf",
    file: "beruf-karten-1000.json",
  },
  health: {
    label: "Gesundheit",
    file: "gesundheit-karten-1000.json",
    notice: "Die Gesundheitskarten sind rein symbolische Unterhaltungsimpulse und keine Diagnose. Bei Beschwerden oder Sorgen wende dich bitte an medizinisches Fachpersonal.",
  },
  geography: {
    label: "Geografie",
    file: "geografie-karten-1000.json",
  },
};

function showScreen(name) {
  Object.entries(screens).forEach(([screenName, element]) => {
    element.classList.toggle("active", screenName === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function shuffle(source) {
  const result = [...source];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function parseNumbers(value) {
  const tokens = value.trim() ? value.trim().split(/[\s,]+/) : [];
  return {
    tokens,
    numbers: tokens
      .filter((token) => /^\d+$/.test(token))
      .map(Number),
  };
}

function validateInput(value) {
  const { tokens, numbers } = parseNumbers(value);
  if (!tokens.length) {
    return { error: "Bitte gib mindestens eine Zahl ein.", numbers: [] };
  }
  if (tokens.some((token) => !/^\d+$/.test(token))) {
    return { error: "Bitte verwende nur ganze Zahlen, Kommas und Leerzeichen.", numbers: [] };
  }
  if (numbers.length > 20) {
    return { error: "Du kannst höchstens 20 Zahlen eingeben.", numbers };
  }
  if (numbers.some((number) => number < 1 || number > 1000)) {
    return { error: "Jede Zahl muss zwischen 1 und 1000 liegen.", numbers };
  }
  return { error: "", numbers };
}

function updateNumberCount() {
  const { numbers } = parseNumbers(numberInput.value);
  numberCount.textContent = `${Math.min(numbers.length, 99)} / 20`;
  numberCount.style.color = numbers.length > 20 ? "#9d3445" : "";
  inputError.textContent = "";
}

function countSelections(numbers) {
  return numbers.reduce((counts, number) => {
    counts.set(number, (counts.get(number) || 0) + 1);
    return counts;
  }, new Map());
}

function pickCards(numbers) {
  const selectionCounts = countSelections(numbers);
  return [...selectionCounts.entries()]
    .map(([number, repetitions]) => ({
      ...currentDeck[number - 1],
      repetitions,
      weightedScore: currentDeck[number - 1].toneScore * repetitions,
    }))
    .sort((first, second) => {
      if (second.repetitions !== first.repetitions) {
        return second.repetitions - first.repetitions;
      }
      return Math.abs(second.weightedScore) - Math.abs(first.weightedScore);
    });
}

function asSentence(text) {
  const clean = text.trim();
  if (!clean) return "";
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function buildInterpretation(selectedCards) {
  const ranked = selectedCards.slice(0, 3);
  const repeated = ranked.find((card) => card.repetitions > 1);
  const messages = ranked.map((card) =>
    asSentence(card.displayText || card.core || card.interpretation || card.title),
  );
  const emphasis = repeated
    ? `Dieser Impuls erscheint ${repeated.repetitions}-mal und wird dadurch verstärkt.`
    : "";

  return `${messages.join(" ")} ${emphasis}`.trim();
}

async function loadCards() {
  try {
    await Promise.all(
      Object.entries(topicSettings).map(async ([topic, settings]) => {
        const response = await fetch(settings.file);
        if (!response.ok) throw new Error("Kartendaten nicht verfügbar");
        const data = await response.json();
        decks[topic] = data.cards;
      }),
    );
  } catch {
    inputError.textContent = "Die Kartendaten konnten nicht geladen werden. Bitte öffne Orakulum über einen Webserver.";
  }
}

document.querySelectorAll("[data-topic]").forEach((button) => {
  button.addEventListener("click", () => {
    const topic = button.dataset.topic;
    if (!decks[topic]) return;
    currentTopic = topic;
    currentDeck = shuffle(decks[topic]);
    document.querySelector("#activeTopicLabel").textContent = topicSettings[topic].label;
    const topicNotice = document.querySelector("#topicNotice");
    topicNotice.textContent = topicSettings[topic].notice || "";
    topicNotice.classList.toggle("visible", Boolean(topicSettings[topic].notice));
    showScreen("question");
    setTimeout(() => numberInput.focus(), 300);
  });
});

document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => showScreen("home"));
});

document.querySelector("#homeButton").addEventListener("click", () => showScreen("home"));
numberInput.addEventListener("input", updateNumberCount);

numberForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const validation = validateInput(numberInput.value);
  if (validation.error) {
    inputError.textContent = validation.error;
    return;
  }
  if (currentDeck.length !== 1000) {
    inputError.textContent = "Die Karten sind noch nicht bereit. Bitte versuche es gleich erneut.";
    return;
  }

  currentMessage = buildInterpretation(pickCards(validation.numbers));
  numberInput.value = "";
  updateNumberCount();
  showScreen("loading");
  window.setTimeout(() => {
    resultMessage.textContent = currentMessage;
    showScreen("result");
  }, 4000);
});

document.querySelector("#newQuestionButton").addEventListener("click", () => {
  currentDeck = shuffle(decks[currentTopic]);
  currentMessage = "";
  resultMessage.textContent = "";
  shareStatus.textContent = "";
  showScreen("question");
  setTimeout(() => numberInput.focus(), 300);
});

document.querySelector("#shareButton").addEventListener("click", async () => {
  const shareText = `${currentMessage}\n\nOrakulum`;
  try {
    if (navigator.share) {
      await navigator.share({ text: shareText });
      shareStatus.textContent = "";
      return;
    }
    await navigator.clipboard.writeText(shareText);
    shareStatus.textContent = "Die Botschaft wurde kopiert.";
  } catch (error) {
    if (error.name !== "AbortError") {
      shareStatus.textContent = "Die Botschaft konnte nicht geteilt werden.";
    }
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

loadCards();
