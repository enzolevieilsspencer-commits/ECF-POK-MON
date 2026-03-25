// ECF Pokémon — page d’accueil / liste : on réécrit la logique ensemble, étape par étape.
const LIMIT = 50;
let offset = 0;

// Stockage de l'équipe (MAX 6)
const TEAM_KEY = "mon_equipe_v1";
const TEAM_MAX = 6;

// Cache long terme des détails Pokémon pour éviter les refetch inutiles
const POKEMON_DETAILS_CACHE_KEY = "pokemon_details_cache_v1";

// Cache temporaire quand on navigue vers details.html puis qu'on revient
const CACHE_KEY = "pokemon_list_cache_v1";
const SCROLL_KEY = "pokemon_list_scrollY_v1";

let cartesChargees = [];
let hasMore = true;

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function lireDetailsCache() {
  try {
    const raw = localStorage.getItem(POKEMON_DETAILS_CACHE_KEY);
    if (!raw) return { version: 1, byId: {} };
    const parsed = safeJsonParse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.byId) return { version: 1, byId: {} };
    return parsed;
  } catch {
    return { version: 1, byId: {} };
  }
}

function sauvegarderDetailsCache(cache) {
  try {
    localStorage.setItem(POKEMON_DETAILS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore si localStorage indisponible ou plein
  }
}

function extraireIdDepuisUrl(url) {
  // Exemple: https://pokeapi.co/api/v2/pokemon/1/
  const parts = String(url).split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const id = Number(last);
  return Number.isFinite(id) ? id : null;
}

function regionDepuisId(id) {
  // Approximation par génération (ID PokeDex). Les options UI semblent limitées à 5 régions.
  if (id >= 1 && id <= 151) return "kanto";
  if (id >= 152 && id <= 251) return "johto";
  if (id >= 252 && id <= 386) return "hoenn";
  if (id >= 387 && id <= 493) return "sinnoh";
  if (id >= 494 && id <= 649) return "teselia";
  return "";
}

function getCurrentFilters() {
  const search = document.querySelector("#search")?.value?.trim().toLowerCase() || "";
  const region = document.querySelector("#region")?.value || "";
  const type = document.querySelector("#type")?.value || "";
  return { search, region, type };
}

function pokemonMatchFiltres(pokemon, filters) {
  if (!pokemon) return false;

  if (filters.search) {
    const name = String(pokemon.name || "").toLowerCase();
    if (!name.includes(filters.search)) return false;
  }

  if (filters.type) {
    const types = Array.isArray(pokemon.types) ? pokemon.types : [];
    if (!types.includes(filters.type)) return false;
  }

  if (filters.region) {
    const pokemonRegion = regionDepuisId(pokemon.id);
    if (pokemonRegion !== filters.region) return false;
  }

  return true;
}

function appliquerFiltresEtRendre() {
  const filters = getCurrentFilters();
  const cartesFiltrees = cartesChargees.filter((p) => pokemonMatchFiltres(p, filters));
  rendreCartes(cartesFiltrees);
}

function lireCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sauvegarderCache() {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        version: 1,
        offset,
        hasMore,
        cards: cartesChargees,
      }),
    );
  } catch {
    // ignore si sessionStorage indisponible
  }
}

function sauvegarderScroll() {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY || 0));
  } catch {
    // ignore
  }
}

window.addEventListener("pagehide", sauvegarderScroll);

function lireEquipe() {
  const json = localStorage.getItem(TEAM_KEY);
  return json ? JSON.parse(json) : [];
}

function sauvegarderEquipe(equipe) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(equipe));
}

function togglePokemonDansEquipe(pokemon) {
  const equipe = lireEquipe();
  const idx = equipe.findIndex((p) => p.id === pokemon.id);

  // Retrait si déjà présent
  if (idx !== -1) {
    equipe.splice(idx, 1);
    sauvegarderEquipe(equipe);
    return { ok: true, added: false, equipe };
  }

  // Ajout si équipe pas pleine
  if (equipe.length >= TEAM_MAX) {
    return {
      ok: false,
      message: "Ton équipe est déjà pleine (MAX 6).",
      equipe,
    };
  }

  equipe.push(pokemon);
  sauvegarderEquipe(equipe);
  return { ok: true, added: true, equipe };
}

function creerCartePokemon(pokemon) {
  const pokemonCard = document.createElement("a");
  pokemonCard.className = "pokemon-card";
  pokemonCard.href = `details.html?id=${pokemon.id}`;
  pokemonCard.style.textDecoration = "none";
  pokemonCard.style.color = "inherit";

  const img = document.createElement("img");
  img.className = "pokemon-image";
  img.src = pokemon.image;
  img.alt = pokemon.name;

  const h3 = document.createElement("h3");
  h3.className = "pokemon-name";
  h3.textContent = pokemon.name;

  const p = document.createElement("p");
  p.className = "pokemon-number";
  const typesText = (pokemon.types || []).join(", ");
  p.textContent = `#${String(pokemon.id).padStart(4, "0")} · ${typesText}`;

  // Etoile pour ajouter à l'équipe
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "pokemon-add-btn";
  addBtn.setAttribute("aria-label", "Ajouter à l'équipe");
  addBtn.innerHTML = `<i class="fas fa-star" aria-hidden="true"></i>`;

  const inTeam = lireEquipe().some((p0) => p0.id === pokemon.id);
  if (inTeam) addBtn.classList.add("is-favorite");

  addBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const result = togglePokemonDansEquipe(pokemon);
    if (!result.ok) {
      // Pour l'instant, on log (on pourra mettre un message UI après)
      console.warn(result.message);
      return;
    }

    const nowInTeam = result.equipe.some((p0) => p0.id === pokemon.id);
    addBtn.classList.toggle("is-favorite", nowInTeam);
  });

  pokemonCard.appendChild(img);
  pokemonCard.appendChild(addBtn);
  pokemonCard.appendChild(h3);
  pokemonCard.appendChild(p);

  return pokemonCard;
}

function rendreCartes(cartes) {
  const pokemonList = document.querySelector(".pokemon-grid");
  if (!pokemonList) return;

  pokemonList.innerHTML = "";
  cartes.forEach((pokemon) => pokemonList.appendChild(creerCartePokemon(pokemon)));
}

function restaurerSiPossible() {
  const cache = lireCache();
  if (!cache || !Array.isArray(cache.cards) || cache.cards.length === 0) return false;

  cartesChargees = cache.cards;
  offset = typeof cache.offset === "number" ? cache.offset : cartesChargees.length;
  hasMore = typeof cache.hasMore === "boolean" ? cache.hasMore : true;

  appliquerFiltresEtRendre();

  const loadBtn = document.querySelector("#load-more");
  if (loadBtn) loadBtn.disabled = !hasMore;

  const savedScrollY = Number(sessionStorage.getItem(SCROLL_KEY) || 0);
  if (savedScrollY > 0) {
    // Laisse le layout finir de se mettre en place avant de remonter.
    setTimeout(() => window.scrollTo(0, savedScrollY), 0);
  }

  return true;
}

function chargerListePokemons(resetGrille) {
  const loadBtn = document.querySelector("#load-more");
  if (loadBtn) loadBtn.disabled = true;

  if (resetGrille) {
    cartesChargees = [];
    offset = 0;
    hasMore = true;
    sauvegarderCache();

    // Pour éviter que l'ancienne grille reste affichée pendant le rechargement
    const pokemonList = document.querySelector(".pokemon-grid");
    if (pokemonList) pokemonList.innerHTML = "";
  }

  fetch(`https://pokeapi.co/api/v2/pokemon?limit=${LIMIT}&offset=${offset}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Erreur HTTP: " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      const detailsCache = lireDetailsCache();
      let detailsCacheMutated = false;

      const promises = data.results.map((pokemonSummary) => {
        const id = extraireIdDepuisUrl(pokemonSummary.url);
        if (id && detailsCache.byId && detailsCache.byId[id]) {
          return Promise.resolve(detailsCache.byId[id]);
        }

        return fetch(pokemonSummary.url).then((response) => {
          if (!response.ok) {
            throw new Error("Erreur HTTP: " + response.status);
          }
          return response.json();
        }).then((detail) => {
          const imgSrc =
            detail.sprites?.other?.["official-artwork"]?.front_default ||
            detail.sprites?.front_default ||
            "";

          const pokemonTypes = (detail.types || []).map((t) => t.type.name);

          const simplified = {
            id: detail.id,
            name: detail.name,
            image: imgSrc,
            types: pokemonTypes,
          };

          if (simplified.id != null) {
            detailsCache.byId[simplified.id] = simplified;
            detailsCacheMutated = true;
          }

          return simplified;
        });
      });

      return Promise.all(promises).then((details) => {
        if (detailsCacheMutated) sauvegarderDetailsCache(detailsCache);
        return { details, data };
      });
    })
    .then(({ details, data }) => {
      // Renforce la robustesse contre d'éventuels doublons
      const dejaPresent = new Set(cartesChargees.map((p) => p.id));
      details.forEach((pokemon) => {
        if (!pokemon || !pokemon.id) return;
        if (dejaPresent.has(pokemon.id)) return;
        cartesChargees.push(pokemon);
        dejaPresent.add(pokemon.id);
      });

      offset += data.results.length;
      hasMore = data.next !== null;
      sauvegarderCache();

      if (loadBtn) {
        loadBtn.disabled = !hasMore;
      }

      appliquerFiltresEtRendre();
    })
    .catch((error) => {
      console.error("Erreur:", error);
      if (loadBtn) loadBtn.disabled = false;
    });
}

// Recherche + filtres (filtrent uniquement ce qui est déjà chargé)
function initialiserRechercheEtFiltres() {
  const search = document.querySelector("#search");
  const region = document.querySelector("#region");
  const type = document.querySelector("#type");

  const rafDebounce = (fn, delayMs = 120) => {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delayMs);
    };
  };

  const handler = rafDebounce(() => {
    appliquerFiltresEtRendre();
  });

  search?.addEventListener("input", handler);
  region?.addEventListener("change", handler);
  type?.addEventListener("change", handler);
}

initialiserRechercheEtFiltres();

if (!restaurerSiPossible()) {
  chargerListePokemons(true);
}

document.querySelector("#load-more")?.addEventListener("click", () => {
  chargerListePokemons(false);
});
