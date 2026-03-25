const TEAM_KEY = "mon_equipe_v1";
const TEAM_MAX = 6;

function pad4(number) {
  // Affiche #0001 au lieu de #1
  let s = String(number);
  while (s.length < 4) s = "0" + s;
  return s;
}

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

  let typesHtml = "";
  let types = pokemon.types || [];
  for (let i = 0; i < types.length; i++) {
    typesHtml = typesHtml + '<span class="pokemon-badge">' + types[i] + "</span>";
  }

  card.innerHTML =
    '<div class="pokemon-card-top">' +
    '<a class="pokemon-card-link" href="details.html?id=' +
    pokemon.id +
    '" aria-label="Voir les détails de ' +
    pokemon.name +
    '">' +
    '<img class="pokemon-image" src="' +
    pokemon.image +
    '" alt="' +
    pokemon.name +
    '">' +
    '<div class="pokemon-content">' +
    '<h3 class="pokemon-title">' +
    pokemon.name +
    "</h3>" +
    '<p class="pokemon-number">#' +
    pad4(pokemon.id) +
    "</p>" +
    '<div class="pokemon-badges">' +
    typesHtml +
    "</div>" +
    "</div>" +
    "</a>" +
    "</div>" +
    '<div class="pokemon-card-bottom">' +
    '<button class="pokemon-add-btn is-favorite" type="button" aria-label="Supprimer">' +
    '<i class="fas fa-star" aria-hidden="true"></i> Supprimer' +
    "</button>" +
    "</div>";

  let btn = card.querySelector("button.pokemon-add-btn");
  btn.addEventListener("click", function () {
    let equipe = lireEquipe();
    let idx = -1;
    for (let k = 0; k < equipe.length; k++) {
      if (equipe[k].id === pokemon.id) {
        idx = k;
        break;
      }
    }
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

  let max = TEAM_MAX;
  if (equipe.length < max) max = equipe.length;
  for (let i2 = 0; i2 < max; i2++) {
    teamGrid.appendChild(creerCartePokemon(equipe[i2]));
  }
}

afficherEquipe();
