(function (root) {
  const STORAGE_KEY = "whos-round-v1";
  const HISTORY_CAP = 12;
  const PEOPLE_MIN = 2;
  const PEOPLE_MAX = 24;
  const NAME_MAX = 40;
  const GROUP_MAX = 48;

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clampText(value, max) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  }

  function normalizeName(value) {
    return clampText(value, NAME_MAX);
  }

  function nameKey(name) {
    return normalizeName(name).toLowerCase();
  }

  function compareNames(a, b) {
    return nameKey(a).localeCompare(nameKey(b), undefined, { sensitivity: "base" });
  }

  function blankPerson(name, lastBoughtAt) {
    return {
      id: uid(),
      name: normalizeName(name),
      lastBoughtAt: Number.isFinite(lastBoughtAt) ? lastBoughtAt : 0,
    };
  }

  function normalizePerson(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = normalizeName(raw.name);
    if (!name) return null;
    return {
      id: String(raw.id || uid()).slice(0, 64),
      name: name,
      lastBoughtAt: Number.isFinite(raw.lastBoughtAt) ? Math.max(0, Math.round(raw.lastBoughtAt)) : 0,
    };
  }

  function normalizeHistoryItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const personId = String(raw.personId || "").slice(0, 64);
    const personName = normalizeName(raw.personName);
    if (!personId || !personName) return null;
    return {
      id: String(raw.id || uid()).slice(0, 64),
      at: Number.isFinite(raw.at) ? Math.max(0, Math.round(raw.at)) : Date.now(),
      personId: personId,
      personName: personName,
    };
  }

  function emptyState() {
    return { v: 1, groupName: "", people: [], history: [] };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return emptyState();
    const people = Array.isArray(raw.people)
      ? raw.people.map(normalizePerson).filter(Boolean).slice(0, PEOPLE_MAX)
      : [];
    const history = Array.isArray(raw.history)
      ? raw.history.map(normalizeHistoryItem).filter(Boolean).slice(0, HISTORY_CAP)
      : [];
    return {
      v: 1,
      groupName: clampText(raw.groupName, GROUP_MAX),
      people: people,
      history: history,
    };
  }

  function canTrack(state) {
    return !!(state && Array.isArray(state.people) && state.people.length >= PEOPLE_MIN);
  }

  function findDuePerson(people) {
    if (!Array.isArray(people) || people.length < PEOPLE_MIN) return null;
    const sorted = people.slice().sort(function (a, b) {
      const aAt = Number(a.lastBoughtAt) || 0;
      const bAt = Number(b.lastBoughtAt) || 0;
      if (aAt !== bAt) return aAt - bAt;
      return compareNames(a.name, b.name);
    });
    return sorted[0] || null;
  }

  function sampleGroup() {
    return {
      v: 1,
      groupName: "Coffee",
      people: [
        blankPerson("Alex", 0),
        blankPerson("Jordan", 0),
        blankPerson("Sam", 0),
      ],
      history: [],
    };
  }

  function addPerson(state, name) {
    const next = normalizeState(state);
    const cleaned = normalizeName(name);
    if (!cleaned) return { ok: false, reason: "empty", state: next };
    if (next.people.length >= PEOPLE_MAX) return { ok: false, reason: "max", state: next };
    const key = nameKey(cleaned);
    if (
      next.people.some(function (person) {
        return nameKey(person.name) === key;
      })
    ) {
      return { ok: false, reason: "dup", state: next };
    }
    next.people.push(blankPerson(cleaned, 0));
    return { ok: true, state: next };
  }

  function renamePerson(state, personId, name) {
    const next = normalizeState(state);
    const cleaned = normalizeName(name);
    if (!cleaned) return { ok: false, reason: "empty", state: next };
    const idx = next.people.findIndex(function (person) {
      return person.id === personId;
    });
    if (idx < 0) return { ok: false, reason: "missing", state: next };
    const key = nameKey(cleaned);
    if (
      next.people.some(function (person, i) {
        return i !== idx && nameKey(person.name) === key;
      })
    ) {
      return { ok: false, reason: "dup", state: next };
    }
    next.people[idx].name = cleaned;
    return { ok: true, state: next };
  }

  function removePerson(state, personId) {
    const next = normalizeState(state);
    const before = next.people.length;
    next.people = next.people.filter(function (person) {
      return person.id !== personId;
    });
    if (next.people.length === before) return { ok: false, reason: "missing", state: next };
    return { ok: true, state: next };
  }

  function setGroupName(state, name) {
    const next = normalizeState(state);
    next.groupName = clampText(name, GROUP_MAX);
    return next;
  }

  function recordBought(state, personId, now) {
    const next = normalizeState(state);
    if (!canTrack(next)) return { ok: false, reason: "min", state: next };
    const idx = next.people.findIndex(function (person) {
      return person.id === personId;
    });
    if (idx < 0) return { ok: false, reason: "missing", state: next };
    const at = Number.isFinite(now) ? now : Date.now();
    const person = next.people[idx];
    person.lastBoughtAt = at;
    const item = {
      id: uid(),
      at: at,
      personId: person.id,
      personName: person.name,
    };
    next.history = [item].concat(next.history).slice(0, HISTORY_CAP);
    return { ok: true, state: next, item: item };
  }

  function undoLastBought(state) {
    const next = normalizeState(state);
    if (!next.history.length) return { ok: false, reason: "empty", state: next };
    const last = next.history[0];
    next.history = next.history.slice(1);
    const person = next.people.find(function (row) {
      return row.id === last.personId;
    });
    if (person) {
      const prior = next.history.find(function (row) {
        return row.personId === person.id;
      });
      person.lastBoughtAt = prior ? prior.at : 0;
    }
    return { ok: true, state: next, undone: last };
  }

  function clearHistory(state) {
    const next = normalizeState(state);
    next.history = [];
    next.people = next.people.map(function (person) {
      return {
        id: person.id,
        name: person.name,
        lastBoughtAt: 0,
      };
    });
    return next;
  }

  function clearGroup(state) {
    return emptyState();
  }

  function sharePayload(state) {
    const src = normalizeState(state);
    return {
      v: 1,
      groupName: src.groupName,
      people: src.people.map(function (person) {
        return {
          id: person.id,
          name: person.name,
          lastBoughtAt: person.lastBoughtAt,
        };
      }),
      history: src.history.map(function (row) {
        return {
          id: row.id,
          at: row.at,
          personId: row.personId,
          personName: row.personName,
        };
      }),
    };
  }

  function parseSharePayload(raw) {
    const state = normalizeState(raw);
    if (!canTrack(state)) return null;
    return state;
  }

  function formatAsText(state) {
    const src = normalizeState(state);
    const due = findDuePerson(src.people);
    const lines = ["Who's Round"];
    if (src.groupName) lines.push(src.groupName);
    if (due) lines.push("Due next: " + due.name);
    if (src.people.length) {
      lines.push(
        "Group: " +
          src.people
            .slice()
            .sort(function (a, b) {
              return compareNames(a.name, b.name);
            })
            .map(function (person) {
              return person.name;
            })
            .join(", ")
      );
    }
    return lines.join("\n");
  }

  const WhosRound = {
    STORAGE_KEY: STORAGE_KEY,
    HISTORY_CAP: HISTORY_CAP,
    PEOPLE_MIN: PEOPLE_MIN,
    PEOPLE_MAX: PEOPLE_MAX,
    NAME_MAX: NAME_MAX,
    GROUP_MAX: GROUP_MAX,
    uid: uid,
    clampText: clampText,
    normalizeName: normalizeName,
    compareNames: compareNames,
    blankPerson: blankPerson,
    normalizePerson: normalizePerson,
    emptyState: emptyState,
    normalizeState: normalizeState,
    canTrack: canTrack,
    findDuePerson: findDuePerson,
    sampleGroup: sampleGroup,
    addPerson: addPerson,
    renamePerson: renamePerson,
    removePerson: removePerson,
    setGroupName: setGroupName,
    recordBought: recordBought,
    undoLastBought: undoLastBought,
    clearHistory: clearHistory,
    clearGroup: clearGroup,
    sharePayload: sharePayload,
    parseSharePayload: parseSharePayload,
    formatAsText: formatAsText,
  };

  root.WhosRound = WhosRound;
})(typeof globalThis !== "undefined" ? globalThis : this);
