// ECF Pokémon — page « Mon équipe » : affichage & suppression depuis localStorage.
const TEAM_KEY = "mon_equipe_v1";
const TEAM_MAX = 6;

function lireEquipe() {
  const json = localStorage.getItem(TEAM_KEY);
  return json ? JSON.parse(json) : [];
}

function sauvegarderEquipe(equipe) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(equipe));
}

function creerCartePokemon(pokemon) {
  const card = document.createElement("div");
  card.className = "pokemon-card";

  const typesHtml = (pokemon.types || [])
    .map((t) => `<span class="pokemon-badge">${t}</span>`)
    .join("");

  card.innerHTML = `
    <div class="pokemon-card-top">
      <a
        class="pokemon-card-link"
        href="details.html?id=${pokemon.id}"
        aria-label="Voir les détails de ${pokemon.name}"
      >
        <img class="pokemon-image" src="${pokemon.image}" alt="${pokemon.name}">
        <div class="pokemon-content">
          <h3 class="pokemon-title">${pokemon.name}</h3>
          <p class="pokemon-number">#${String(pokemon.id).padStart(4, "0")}</p>
          <div class="pokemon-badges">${typesHtml}</div>
        </div>
      </a>
    </div>

    <div class="pokemon-card-bottom">
      <button class="pokemon-add-btn is-favorite" type="button" aria-label="Supprimer">
        <i class="fas fa-star" aria-hidden="true"></i> Supprimer
      </button>
    </div>
  `;

  card.querySelector("button.pokemon-add-btn").addEventListener("click", () => {
    const equipe = lireEquipe();
    const idx = equipe.findIndex((p) => p.id === pokemon.id);
    if (idx === -1) return;

    equipe.splice(idx, 1);
    sauvegarderEquipe(equipe);
    afficherEquipe();
  });

  return card;
}

function afficherEquipe() {
  const teamGrid = document.querySelector("#team-grid");
  if (!teamGrid) return;

  const equipe = lireEquipe();
  teamGrid.innerHTML = "";

  if (equipe.length === 0) {
    teamGrid.innerHTML = "<p>Ton équipe est vide.</p>";
    return;
  }

  equipe.slice(0, TEAM_MAX).forEach((pokemon) => {
    teamGrid.appendChild(creerCartePokemon(pokemon));
  });
}

afficherEquipe();
