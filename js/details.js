const detailRoot = document.querySelector("#detail-root");
const id = new URLSearchParams(window.location.search).get("id");

if (!detailRoot) {
  console.error("Aucun conteneur #detail-root trouvé.");
} else if (!id) {
  detailRoot.textContent = "ID de Pokémon manquant dans l’URL.";
} else {
  fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    .then((response) => {
      if (!response.ok) throw new Error("Erreur HTTP: " + response.status);
      return response.json();
    })
    .then((detail) => {
      const backLinkHtml = detailRoot.querySelector("a")?.outerHTML || "";
      const imgSrc =
        detail.sprites?.other?.["official-artwork"]?.front_default ||
        detail.sprites?.front_default ||
        "";

      const typesHtml = detail.types
        .map((entry) => `<span class="pokemon-badge">${entry.type.name}</span>`)
        .join("");

      const statsHtml = detail.stats
        .map(
          (entry) =>
            `<span class="pokemon-badge">${entry.stat.name}: ${entry.base_stat}</span>`,
        )
        .join("");

      detailRoot.innerHTML = `
        ${backLinkHtml}
        <article class="pokemon-card">
          <div class="pokemon-card-top">
            <img class="pokemon-image" src="${imgSrc}" alt="${detail.name}">
            <div class="pokemon-content">
              <h3 class="pokemon-title">${detail.name}</h3>
              <p class="pokemon-number">#${String(detail.id).padStart(4, "0")}</p>
              <div class="pokemon-badges">${typesHtml}</div>
            </div>
          </div>
          <div class="pokemon-card-bottom">
            <div class="pokemon-stats">${statsHtml}</div>
          </div>
        </article>
      `;
    })
    .catch((error) => {
      console.error("Erreur:", error);
      detailRoot.textContent = "Impossible de charger ce Pokémon.";
    });
}
