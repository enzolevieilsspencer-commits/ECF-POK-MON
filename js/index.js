const TEAM_KEY = "mon_equipe_v1";
const TEAM_MAX = 6;

function lireEquipe() {
  const json = localStorage.getItem(TEAM_KEY);
  return json ? JSON.parse(json) : [];
}

function sauvegarderEquipe(equipe) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(equipe));
}

function ajouterPokemonEquipe(pokemon) {
  const equipe = lireEquipe();

  const dejaPresent = equipe.some((p) => p.id === pokemon.id);
  if (dejaPresent) {
    return {
      message: "Ce Pokémon est déjà dans ton équipe.",
      type: "error",
    };
  }

  if (equipe.length >= TEAM_MAX) {
    return {
      message: "Ton équipe est déjà complète (6).",
      type: "error",
    };
  }

  equipe.push(pokemon);
  sauvegarderEquipe(equipe);
  return {
    message: `${pokemon.name} ajouté à ton équipe !`,
    type: "success",
  };
}

function supprimerPokemonEquipe(idPokemon) {
  const equipe = lireEquipe();
  const nouvelleEquipe = equipe.filter((p) => p.id !== idPokemon);

  if (nouvelleEquipe.length === equipe.length) {
    return {
      message: "Ce Pokémon n'est pas dans ton équipe.",
      type: "error",
    };
  }

  sauvegarderEquipe(nouvelleEquipe);
  return {
    message: "Pokémon retiré de ton équipe.",
    type: "success",
  };
}

function estDansEquipe(idPokemon) {
  const equipe = lireEquipe();
  return equipe.some((p) => p.id === idPokemon);
}

function majEtatBoutonFavori(bouton, estFavori) {
  bouton.classList.toggle("is-favorite", estFavori);
  bouton.innerHTML = estFavori
    ? '<i class="fas fa-star" aria-hidden="true"></i> Supprimer'
    : '<i class="fas fa-star" aria-hidden="true"></i> Ajouter';
}

const pokemonList = document.querySelector(".pokemon-grid");
const searchInput = document.getElementById("search");
const loadMoreButton = document.getElementById("load-more");
const mesPokemons = [];
const LIMIT = 1300;
const PAGE_SIZE = 50;
const CACHE_KEY = "pokedex_all_pokemons_v1";
let nombreAffiches = PAGE_SIZE;

function obtenirRegion(idPokemon) {
  if (idPokemon <= 151) return "Kanto";
  if (idPokemon <= 251) return "Johto";
  if (idPokemon <= 386) return "Hoenn";
  if (idPokemon <= 493) return "Sinnoh";
  if (idPokemon <= 649) return "Teselia";
  return "Autre";
}

function formaterId(idPokemon) {
  return `#${String(idPokemon).padStart(4, "0")}`;
}

function afficherPokemons(liste) {
  pokemonList.innerHTML = "";

  for (const pokemon of liste) {
    const card = document.createElement("article");
    card.className = "pokemon-card";

    const zoneHaut = document.createElement("div");
    zoneHaut.className = "pokemon-card-top";

    const image = document.createElement("img");
    image.src = pokemon.image;
    image.alt = pokemon.name;
    image.className = "pokemon-image";

    const contenu = document.createElement("div");
    contenu.className = "pokemon-content";

    const titre = document.createElement("h3");
    titre.className = "pokemon-title";
    titre.textContent =
      pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

    const numero = document.createElement("p");
    numero.className = "pokemon-number";
    numero.textContent = formaterId(pokemon.id);

    const badges = document.createElement("div");
    badges.className = "pokemon-badges";

    const badgesATraiter = [
      ...pokemon.types.slice(0, 2),
      obtenirRegion(pokemon.id),
    ];
    for (const texteBadge of badgesATraiter) {
      const badge = document.createElement("span");
      badge.className = "pokemon-badge";
      badge.textContent =
        texteBadge.charAt(0).toUpperCase() + texteBadge.slice(1);
      badges.appendChild(badge);
    }

    const zoneBas = document.createElement("div");
    zoneBas.className = "pokemon-card-bottom";

    const details = document.createElement("a");
    details.className = "pokemon-details-link";
    details.href = `pokemon.html?name=${pokemon.name}`;
    details.innerHTML = 'Détails <span aria-hidden="true">→</span>';

    const ajouterBtn = document.createElement("button");
    ajouterBtn.className = "pokemon-add-btn";
    ajouterBtn.type = "button";
    majEtatBoutonFavori(ajouterBtn, estDansEquipe(pokemon.id));
    
    const messageAjout = document.createElement("p");
    messageAjout.className = "pokemon-add-message";

    ajouterBtn.addEventListener("click", () => {
      const estFavori = estDansEquipe(pokemon.id);
      const resultat = estFavori
        ? supprimerPokemonEquipe(pokemon.id)
        : ajouterPokemonEquipe(pokemon);

      messageAjout.textContent = resultat.message;
      messageAjout.classList.toggle("success", resultat.type === "success");

      if (messageAjout._hideTimeout) {
        clearTimeout(messageAjout._hideTimeout);
      }

      if (resultat.type === "success") {
        majEtatBoutonFavori(ajouterBtn, !estFavori);
      }

      messageAjout._hideTimeout = setTimeout(() => {
        messageAjout.textContent = "";
        messageAjout.classList.remove("success");
      }, 3000);
    });

    const actionsDroite = document.createElement("div");
    actionsDroite.className = "pokemon-card-actions";
    actionsDroite.appendChild(messageAjout);
    actionsDroite.appendChild(ajouterBtn);

    contenu.appendChild(titre);
    contenu.appendChild(numero);
    contenu.appendChild(badges);

    zoneHaut.appendChild(image);
    zoneHaut.appendChild(contenu);

    zoneBas.appendChild(details);
    zoneBas.appendChild(actionsDroite);

    card.appendChild(zoneHaut);
    card.appendChild(zoneBas);

    pokemonList.appendChild(card);
  }
}

function majBoutonChargerPlus(total) {
  if (nombreAffiches >= total) {
    loadMoreButton.style.display = "none";
    return;
  }
  loadMoreButton.style.display = "inline-block";
}

function afficherPageCourante() {
  const aAfficher = mesPokemons.slice(0, nombreAffiches);
  afficherPokemons(aAfficher);
  majBoutonChargerPlus(mesPokemons.length);
}

function lireCachePokemons() {
  try {
    const cache = localStorage.getItem(CACHE_KEY);
    if (!cache) return null;

    const donnees = JSON.parse(cache);
    if (!Array.isArray(donnees) || donnees.length === 0) return null;

    return donnees;
  } catch (erreur) {
    console.warn("Cache Pokemon invalide, rechargement depuis l'API.", erreur);
    return null;
  }
}

function sauvegarderCachePokemons(donnees) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(donnees));
  } catch (erreur) {
    console.warn("Impossible de sauvegarder le cache Pokemon.", erreur);
  }
}

async function recupererDetailsPokemon(results) {
  const details = [];
  const TAILLE_LOT = 40;

  for (let i = 0; i < results.length; i += TAILLE_LOT) {
    const lot = results.slice(i, i + TAILLE_LOT);
    const detailsLot = await Promise.all(
      lot.map(async (pokemon) => {
        const reponseDetail = await fetch(pokemon.url);
        if (!reponseDetail.ok)
          throw new Error(`Impossible de charger ${pokemon.name}.`);
        return reponseDetail.json();
      }),
    );
    details.push(...detailsLot);
  }

  return details;
}

async function chargerPokemons() {
  try {
    const pokemonsEnCache = lireCachePokemons();

    if (pokemonsEnCache) {
      mesPokemons.push(...pokemonsEnCache);
      afficherPageCourante();
      return;
    }

    const reponse = await fetch(
      `https://pokeapi.co/api/v2/pokemon?limit=${LIMIT}`,
    );
    if (!reponse.ok) throw new Error("Impossible de charger la liste.");
    const data = await reponse.json();
    const details = await recupererDetailsPokemon(data.results);

    const pokemonsFormates = details.map((detail) => {
      const imagePokemon =
        detail.sprites?.other?.["official-artwork"]?.front_default ||
        detail.sprites?.front_default ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${detail.id}.png`;

      return {
        id: detail.id,
        name: detail.name,
        image: imagePokemon,
        types: detail.types.map((t) => t.type.name),
      };
    });

    mesPokemons.push(...pokemonsFormates);
    sauvegarderCachePokemons(pokemonsFormates);
    afficherPageCourante();
  } catch (erreur) {
    pokemonList.textContent = "Erreur lors du chargement des Pokémon.";
    console.error(erreur);
  }
}

loadMoreButton.addEventListener("click", () => {
  nombreAffiches += PAGE_SIZE;
  afficherPageCourante();
});

chargerPokemons();
