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
const resultNote = document.querySelector("#resultNote");
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
  finance: {
    label: "Finanzen",
    file: "finanzen-karten-1000.json",
    notice: "Die Finanzkarten dienen ausschließlich der Unterhaltung und sind keine Finanz-, Anlage-, Steuer- oder Rechtsberatung.",
  },
  psychology: {
    label: "Psychologie",
    file: "psychologie-karten-1000.json",
    heading: "Welches psychologische Thema liegt in meinem Energiefeld?",
    notice: "Die psychologischen Fachbegriffe sind ausschließlich symbolische Unterhaltungsimpulse. Sie sind keine Diagnose und ersetzen keine psychologische, psychotherapeutische oder medizinische Beratung.",
  },
};

const defaultQuestionHeading = "Nimm dir einen Moment Ruhe.";
const defaultQuestionInstruction = "Gib intuitiv bis zu 20 beliebige Zahlen zwischen 1 und 1000 ein.";

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

function lowerFirst(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function withoutFullStop(text) {
  return text.trim().replace(/[.!?]+$/, "");
}

function joinItems(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} und ${items.at(-1)}`;
}

function renderCareerCards(cards) {
  const groups = cards.reduce((result, card) => {
    (result[card.cardType] ||= []).push(card);
    return result;
  }, {});
  const messages = [];
  const texts = (type) => (groups[type] || []).map((card) => withoutFullStop(card.displayText));

  if (groups.situation) {
    messages.push(`Als berufliche Entwicklung zeigt sich: ${joinItems(texts("situation"))}.`);
  }
  if (groups.field) {
    messages.push(`Das Arbeitsfeld weist in Richtung ${joinItems(texts("field"))}.`);
  }

  const tasks = [...texts("work"), ...texts("activity")];
  if (tasks.length) {
    messages.push(`Beruflich stehen diese Aufgaben im Mittelpunkt: ${joinItems(tasks)}.`);
  }
  if (groups.money) {
    messages.push(`Finanziell zeigen sich: ${joinItems(texts("money"))}.`);
  }
  if (groups.time) {
    messages.push(`Zeitlich zeigt sich: ${joinItems(texts("time"))}.`);
  }
  if (groups.symbol) {
    messages.push(`Als weitere Einflüsse zeigen sich: ${joinItems(texts("symbol"))}.`);
  }

  return messages;
}

function renderLoveCard(card, index) {
  const text = withoutFullStop(card.displayText);
  if (card.cardType === "angel") {
    return `${text} begleitet diese Liebesbotschaft.`;
  }
  if (card.cardType === "time") {
    return `Zeitlich zeigt sich: ${text}.`;
  }
  if (index === 0) return `Im Mittelpunkt steht: ${text}.`;
  if (index === 1) return `Gleichzeitig zeigt sich: ${text}.`;
  if (index === 2) return `Hinzu kommt: ${text}.`;
  return `Als weiterer Hinweis erscheint: ${text}.`;
}

function renderFinanceCards(cards) {
  const groups = cards.reduce((result, card) => {
    (result[card.cardType] ||= []).push(withoutFullStop(card.displayText));
    return result;
  }, {});
  const messages = [];

  if (groups.positive) {
    messages.push(`Als positive finanzielle Tendenzen zeigen sich: ${joinItems(groups.positive)}.`);
  }
  if (groups.finance) {
    messages.push(`Im Mittelpunkt stehen: ${joinItems(groups.finance)}.`);
  }
  if (groups.warning) {
    messages.push(`Als finanzielle Warnhinweise erscheinen: ${joinItems(groups.warning)}.`);
  }
  if (groups.time) {
    messages.push(`Zeitlich zeigt sich: ${joinItems(groups.time)}.`);
  }
  return messages;
}

function renderPsychologyCards(cards) {
  const terms = cards.map((card) => withoutFullStop(card.displayText));
  return [`${joinItems(terms)}.`];
}

function buildInterpretation(selectedCards) {
  const ranked = selectedCards.slice(0, 4);
  const repeated = ranked.find((card) => card.repetitions > 1);
  let messages;

  if (currentTopic === "career") {
    messages = renderCareerCards(ranked);
  } else if (currentTopic === "love") {
    messages = ranked
      .sort((first, second) => {
        const order = { angel: 0, message: 1, time: 2 };
        return (order[first.cardType] ?? 9) - (order[second.cardType] ?? 9);
      })
      .map(renderLoveCard);
  } else if (currentTopic === "health") {
    messages = ranked.map((card) => {
      const text = withoutFullStop(card.displayText.replace(/^Symbolischer Gesundheitsimpuls:\s*/i, ""));
      return `Als symbolischer Impuls zeigt sich ${text}.`;
    });
  } else if (currentTopic === "geography") {
    const places = ranked.map((card) => withoutFullStop(card.displayText));
    messages = [`Die geografischen Hinweise führen zu: ${places.join(", ")}.`];
  } else if (currentTopic === "finance") {
    messages = renderFinanceCards(ranked);
  } else if (currentTopic === "psychology") {
    messages = renderPsychologyCards(ranked);
  } else {
    messages = ranked.map((card) =>
      asSentence(card.displayText || card.core || card.interpretation || card.title),
    );
  }

  const emphasis = repeated
    ? `Der Impuls „${withoutFullStop(repeated.displayText)}“ erscheint ${repeated.repetitions}-mal und wird dadurch verstärkt.`
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
    document.querySelector("#questionHeading").textContent =
      topicSettings[topic].heading || defaultQuestionHeading;
    document.querySelector("#questionInstruction").textContent =
      topicSettings[topic].instruction || defaultQuestionInstruction;
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
  const psychologyNote = currentTopic === "psychology"
    ? "Diese Begriffe beschreiben keine Diagnose, sondern dienen nur als Impulse zur persönlichen Betrachtung."
    : "";
  numberInput.value = "";
  updateNumberCount();
  showScreen("loading");
  window.setTimeout(() => {
    resultMessage.textContent = currentMessage;
    resultNote.textContent = psychologyNote;
    resultNote.classList.toggle("visible", Boolean(psychologyNote));
    showScreen("result");
  }, 4000);
});

document.querySelector("#newQuestionButton").addEventListener("click", () => {
  currentDeck = shuffle(decks[currentTopic]);
  currentMessage = "";
  resultMessage.textContent = "";
  resultNote.textContent = "";
  resultNote.classList.remove("visible");
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
