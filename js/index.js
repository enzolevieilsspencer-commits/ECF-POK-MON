// Page liste Pokémons : recherche, filtres, "Charger plus"
const LIMIT = 50;
let offset = 0;

// Équipe sauvegardée dans `localStorage` (MAX 6)
const TEAM_KEY = "mon_equipe_v1";
const TEAM_MAX = 6;

let cartesChargees = [];
let hasMore = true;

function extraireIdDepuisUrl(url) {
  const parts = String(url).split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const id = Number(last);
  return Number.isFinite(id) ? id : null;
}

function pad4(number) {
  // Affiche #0001 au lieu de #1
  let s = String(number);
  while (s.length < 4) s = "0" + s;
  return s;
}

function regionDepuisId(id) {
  // Région estimée à partir de l'ID (simplification)
  if (id >= 1 && id <= 151) return "kanto";
  if (id >= 152 && id <= 251) return "johto";
  if (id >= 252 && id <= 386) return "hoenn";
  if (id >= 387 && id <= 493) return "sinnoh";
  if (id >= 494 && id <= 649) return "teselia";
  return "";
}

function getCurrentFilters() {
  const searchEl = document.getElementById("search");
  const regionEl = document.getElementById("region");
  const typeEl = document.getElementById("type");

  const search =
    searchEl && searchEl.value
      ? String(searchEl.value).trim().toLowerCase()
      : "";
  const region = regionEl ? regionEl.value : "";
  const type = typeEl ? typeEl.value : "";

  return { search, region, type };
}

function pokemonMatchFiltres(pokemon, filters) {
  if (!pokemon) return false;

  if (filters.search) {
    const name = String(pokemon.name || "").toLowerCase();
    if (name.indexOf(filters.search) === -1) return false;
  }

  if (filters.type) {
    const types = Array.isArray(pokemon.types) ? pokemon.types : [];
    let ok = false;
    for (let i = 0; i < types.length; i++) {
      if (types[i] === filters.type) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }

  if (filters.region) {
    const pokemonRegion = regionDepuisId(pokemon.id);
    if (pokemonRegion !== filters.region) return false;
  }

  return true;
}

function appliquerFiltresEtRendre() {
  const filters = getCurrentFilters();
  const cartesFiltrees = [];
  for (let i = 0; i < cartesChargees.length; i++) {
    const p = cartesChargees[i];
    if (pokemonMatchFiltres(p, filters)) cartesFiltrees.push(p);
  }
  rendreCartes(cartesFiltrees);
}

function lireEquipe() {
  const json = localStorage.getItem(TEAM_KEY);
  return json ? JSON.parse(json) : [];
}

function sauvegarderEquipe(equipe) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(equipe));
}

function togglePokemonDansEquipe(pokemon) {
  const equipe = lireEquipe();
  let idx = -1;
  for (let i = 0; i < equipe.length; i++) {
    if (equipe[i].id === pokemon.id) {
      idx = i;
      break;
    }
  }

  if (idx !== -1) {
    equipe.splice(idx, 1);
    sauvegarderEquipe(equipe);
    return { ok: true, added: false, equipe };
  }

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
  pokemonCard.href = "details.html?id=" + pokemon.id;
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
  p.textContent = "#" + pad4(pokemon.id) + " · " + typesText;

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "pokemon-add-btn";
  addBtn.setAttribute("aria-label", "Ajouter à l'équipe");
  addBtn.innerHTML = '<i class="fas fa-star" aria-hidden="true"></i>';

  const equipe = lireEquipe();
  let inTeam = false;
  for (let i = 0; i < equipe.length; i++) {
    if (equipe[i].id === pokemon.id) {
      inTeam = true;
      break;
    }
  }
  if (inTeam) addBtn.classList.add("is-favorite");

  addBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const result = togglePokemonDansEquipe(pokemon);
    if (!result.ok) {
      console.warn(result.message);
      return;
    }

    let nowInTeam = false;
    for (let i = 0; i < result.equipe.length; i++) {
      if (result.equipe[i].id === pokemon.id) {
        nowInTeam = true;
        break;
      }
    }

    if (nowInTeam) addBtn.classList.add("is-favorite");
    else addBtn.classList.remove("is-favorite");
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
  for (let i = 0; i < cartes.length; i++) {
    pokemonList.appendChild(creerCartePokemon(cartes[i]));
  }
}

function chargerListePokemons(resetGrille) {
  // Charge les Pokémon par lots (limit + offset), puis affiche
  const loadBtn = document.querySelector("#load-more");
  if (loadBtn) loadBtn.disabled = true;

  if (resetGrille) {
    cartesChargees = [];
    offset = 0;
    hasMore = true;

    const pokemonList = document.querySelector(".pokemon-grid");
    if (pokemonList) pokemonList.innerHTML = "";
  }

  fetch(
    "https://pokeapi.co/api/v2/pokemon?limit=" + LIMIT + "&offset=" + offset,
  )
    .then(function (listRes) {
      if (!listRes.ok) throw new Error("Erreur HTTP: " + listRes.status);
      return listRes.json();
    })
    .then(function (data) {
      const results = Array.isArray(data.results) ? data.results : [];
      const details = [];
      let i = 0;

      function pokemonExisteDeja(pokemonId) {
        for (let k = 0; k < cartesChargees.length; k++) {
          if (cartesChargees[k].id === pokemonId) return true;
        }
        return false;
      }

      function chargerSuivant() {
        if (i >= results.length) {
          for (let d = 0; d < details.length; d++) {
            const p = details[d];
            if (!p || !p.id) continue;
            if (pokemonExisteDeja(p.id)) continue;
            cartesChargees.push(p);
          }

          offset = offset + results.length;
          hasMore = data.next !== null;

          if (loadBtn) loadBtn.disabled = !hasMore;
          appliquerFiltresEtRendre();
          return;
        }

        const pokemonSummary = results[i];
        i = i + 1;

        fetch(pokemonSummary.url)
          .then(function (res) {
            if (!res.ok) throw new Error("Erreur HTTP: " + res.status);
            return res.json();
          })
          .then(function (detail) {
            let imgSrc = "";
            if (
              detail &&
              detail.sprites &&
              detail.sprites.other &&
              detail.sprites.other["official-artwork"] &&
              detail.sprites.other["official-artwork"].front_default
            ) {
              imgSrc = detail.sprites.other["official-artwork"].front_default;
            } else if (
              detail &&
              detail.sprites &&
              detail.sprites.front_default
            ) {
              imgSrc = detail.sprites.front_default;
            }

            const pokemonTypes = [];
            if (detail && Array.isArray(detail.types)) {
              for (let t = 0; t < detail.types.length; t++) {
                const typeObj = detail.types[t];
                if (typeObj && typeObj.type && typeObj.type.name) {
                  pokemonTypes.push(typeObj.type.name);
                }
              }
            }

            details.push({
              id: detail.id,
              name: detail.name,
              image: imgSrc,
              types: pokemonTypes,
            });
          })
          .catch(function (error) {
            console.error("Erreur:", error);
          })
          .then(function () {
            chargerSuivant();
          });
      }

      chargerSuivant();
    })
    .catch(function (error) {
      console.error("Erreur:", error);
      if (loadBtn) loadBtn.disabled = false;
    });
}

function initialiserRechercheEtFiltres() {
  const search = document.getElementById("search");
  const region = document.getElementById("region");
  const type = document.getElementById("type");

  if (search) {
    search.addEventListener("input", function () {
      appliquerFiltresEtRendre();
    });
  }

  if (region) {
    region.addEventListener("change", function () {
      appliquerFiltresEtRendre();
    });
  }

  if (type) {
    type.addEventListener("change", function () {
      appliquerFiltresEtRendre();
    });
  }
}

initialiserRechercheEtFiltres();
chargerListePokemons(true);

const loadMoreBtn = document.getElementById("load-more");
if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", function () {
    chargerListePokemons(false);
  });
}
