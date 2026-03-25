const detailRoot = document.querySelector("#detail-root");
const id = new URLSearchParams(window.location.search).get("id");

if (!detailRoot) {
  console.error("Aucun conteneur #detail-root trouvé.");
} else if (!id) {
  detailRoot.textContent = "ID de Pokémon manquant dans l’URL.";
} else {
  function extraireIdDepuisUrl(url) {
    // Exemple: https://pokeapi.co/api/v2/pokemon-species/1/
    const parts = String(url).split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    const num = Number(last);
    return Number.isFinite(num) ? num : null;
  }

  function trouverNodeParEspece(node, targetEspeceName) {
    // Retourne le chemin (tableau de nodes) si on trouve, sinon null.
    const path = [node];
    if (node?.species?.name === targetEspeceName) return path;

    if (Array.isArray(node?.evolves_to)) {
      for (const child of node.evolves_to) {
        const res = trouverNodeParEspece(child, targetEspeceName);
        if (res) return path.concat(res);
      }
    }
    return null;
  }

  async function chargerPokemonArtworkParId(pokemonId) {
    if (!pokemonId) return null;
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    if (!res.ok) throw new Error("Erreur HTTP: " + res.status);
    const detail = await res.json();
    return {
      id: detail.id,
      name: detail.name,
      image:
        detail.sprites?.other?.["official-artwork"]?.front_default ||
        detail.sprites?.front_default ||
        "",
    };
  }

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
            <div class="pokemon-description" id="pokemon-description">Chargement...</div>
          </div>
          <div class="pokemon-card-bottom">
            <div class="pokemon-stats">${statsHtml}</div>
          </div>
          <div style="width: 100%; margin-top: 14px;">
            <h4 style="margin: 0 0 8px; font-size: 16px;">Évolutions</h4>
            <div id="evolutions-container" class="evolution-cards">
              <span class="pokemon-badge">Chargement...</span>
            </div>
          </div>
        </article>
      `;

      const evolutionsContainer = document.querySelector("#evolutions-container");
      const descriptionContainer = document.querySelector("#pokemon-description");

      (async () => {
        try {
          const speciesRes = await fetch(detail.species.url);
          if (!speciesRes.ok) throw new Error("Erreur HTTP: " + speciesRes.status);
          const species = await speciesRes.json();

          if (descriptionContainer) {
            const entries = Array.isArray(species?.flavor_text_entries) ? species.flavor_text_entries : [];
            const enEntry = entries.find((e) => e?.language?.name === "en") || entries[0];
            const raw = enEntry?.flavor_text || "";
            const cleaned = String(raw)
              .replace(/\f/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            descriptionContainer.textContent = cleaned || "Description unavailable.";
          }

          if (!species?.evolution_chain?.url) {
            if (evolutionsContainer) evolutionsContainer.innerHTML = "<span class=\"pokemon-badge\">Aucune</span>";
            return;
          }

          const evoRes = await fetch(species.evolution_chain.url);
          if (!evoRes.ok) throw new Error("Erreur HTTP: " + evoRes.status);
          const evoData = await evoRes.json();

          const chainRoot = evoData?.chain;
          const targetSpeciesName = detail.species?.name;

          if (!chainRoot || !targetSpeciesName) {
            if (evolutionsContainer) evolutionsContainer.innerHTML = "<span class=\"pokemon-badge\">Aucune</span>";
            return;
          }

          // Chemin jusqu'au node courant pour retrouver le parent (sous évolution).
          const path = trouverNodeParEspece(chainRoot, targetSpeciesName);
          if (!path || !Array.isArray(path) || path.length === 0) {
            if (evolutionsContainer) evolutionsContainer.innerHTML = "<span class=\"pokemon-badge\">Aucune</span>";
            return;
          }

          const currentNode = path[path.length - 1];

          // Famille complète (dans le même embranchement) :
          // - le plus petit = les ancêtres sur le chemin (root -> node courante)
          // - le plus grand = les descendants de la node courante (toute la sous-arborescence)
          const ancestorNodes = path; // root -> target

          // Descendants BFS pour garder un ordre "petit -> grand" par niveau
          const descendantNodes = [];
          const queue = Array.isArray(currentNode?.evolves_to) ? currentNode.evolves_to.map((n) => ({ node: n })) : [];
          while (queue.length) {
            const { node } = queue.shift();
            if (!node) continue;
            descendantNodes.push(node);
            if (Array.isArray(node?.evolves_to)) {
              for (const child of node.evolves_to) {
                queue.push({ node: child });
              }
            }
          }

          const evolNodes = ancestorNodes.concat(descendantNodes);

          const evolIds = evolNodes
            .map((n) => extraireIdDepuisUrl(n?.species?.url))
            .filter((n) => Number.isFinite(n));
          const evolPokemons = await Promise.all(
            evolIds.map((pokemonId) => chargerPokemonArtworkParId(pokemonId)),
          );

          function rendreCartes(container, pokemons) {
            if (!container) return;
            const safe = pokemons.filter(Boolean);
            if (safe.length === 0) {
              container.innerHTML = "<span class=\"pokemon-badge\">Aucune</span>";
              return;
            }

            container.innerHTML = safe
              .map(
                (p) => `
                  <a href="details.html?id=${p.id}" class="evolution-card" aria-label="Voir les détails de ${p.name}">
                    <img class="evolution-image" src="${p.image}" alt="${p.name}">
                    <p class="evolution-name">${p.name}</p>
                    <p class="evolution-number">#${String(p.id).padStart(4, "0")}</p>
                  </a>
                `,
              )
              .join("");
          }

          rendreCartes(evolutionsContainer, evolPokemons);
        } catch (error) {
          console.error("Erreur chargement évolution:", error);
          if (evolutionsContainer) evolutionsContainer.innerHTML = "<span class=\"pokemon-badge\">Impossible de charger</span>";
        }
      })();
    })
    .catch((error) => {
      console.error("Erreur:", error);
      detailRoot.textContent = "Impossible de charger ce Pokémon.";
    });
}
