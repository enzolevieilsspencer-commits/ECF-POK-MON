const TEAM_KEY = "mon_equipe_v1";
const teamGrid = document.getElementById("team-grid");

function lireEquipe() {
  const json = localStorage.getItem(TEAM_KEY);
  return json ? JSON.parse(json) : [];
}

function afficherEquipe() {
  const equipe = lireEquipe();
  teamGrid.innerHTML = "";

  if (equipe.length === 0) {
    teamGrid.innerHTML = "<p>Ton équipe est vide.</p>";
    return;
  }

  equipe.forEach((pokemon) => {
    const card = document.createElement("article");
    card.className = "pokemon-card";
    card.innerHTML = `
      <img class="pokemon-image" src="${pokemon.image}" alt="${pokemon.name}">
      <h3>${pokemon.name}</h3>
      <p>#${String(pokemon.id).padStart(4, "0")}</p>
    `;
    teamGrid.appendChild(card);
  });
}

afficherEquipe();
