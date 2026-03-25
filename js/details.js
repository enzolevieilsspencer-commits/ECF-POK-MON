const detailRoot = document.querySelector("#detail-root");
const id = new URLSearchParams(window.location.search).get("id");

if (!detailRoot) {
  console.error("Aucun conteneur #detail-root trouvé.");
} else if (!id) {
  detailRoot.textContent = "ID de Pokémon manquant dans l’URL.";
} else {
  function pad4(number) {
    let s = String(number);
    while (s.length < 4) s = "0" + s;
    return s;
  }

  function extraireIdDepuisUrl(url) {
    if (!url) return null;
    let parts = String(url).split("/").filter(Boolean);
    let last = parts[parts.length - 1];
    let num = Number(last);
    return Number.isFinite(num) ? num : null;
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Erreur HTTP: " + res.status);
      return res.json();
    });
  }

  function obtenirImagePokemon(detail) {
    // Image: préfère "official-artwork" si possible
    let imgSrc = "";

    if (
      detail &&
      detail.sprites &&
      detail.sprites.other &&
      detail.sprites.other["official-artwork"] &&
      detail.sprites.other["official-artwork"].front_default
    ) {
      imgSrc = detail.sprites.other["official-artwork"].front_default;
    } else if (detail && detail.sprites && detail.sprites.front_default) {
      imgSrc = detail.sprites.front_default;
    }

    return imgSrc;
  }

  function chargerArtworkParId(pokemonId) {
    return fetchJson("https://pokeapi.co/api/v2/pokemon/" + pokemonId).then(
      function (detail) {
        return {
          id: detail.id,
          name: detail.name,
          image: obtenirImagePokemon(detail),
        };
      },
    );
  }

  function trouverCheminEvolution(node, targetName) {
    // DFS: cherche le chemin root -> Pokémon cible
    if (node && node.species && node.species.name === targetName) return [node];

    let children =
      node && Array.isArray(node.evolves_to) ? node.evolves_to : [];
    for (let i = 0; i < children.length; i++) {
      let res = trouverCheminEvolution(children[i], targetName);
      if (res) {
        let arr = [node];
        for (let j = 0; j < res.length; j++) arr.push(res[j]);
        return arr;
      }
    }
    return null;
  }

  function collecterDescendants(startNode) {
    // BFS: récupère les descendants "niveau par niveau"
    let result = [];
    let queue =
      startNode && Array.isArray(startNode.evolves_to)
        ? startNode.evolves_to.slice()
        : [];

    while (queue.length > 0) {
      let node = queue.shift();
      if (!node) continue;

      result.push(node);

      if (node.evolves_to && Array.isArray(node.evolves_to)) {
        for (let k = 0; k < node.evolves_to.length; k++) {
          queue.push(node.evolves_to[k]);
        }
      }
    }

    return result;
  }

  function nettoyerTexteDescription(raw) {
    // Nettoie le texte (retire les sauts/espaces bizarres)
    return String(raw || "")
      .replace(/\f/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function rendreEvolutions(container, pokemons) {
    if (!container) return;
    if (!pokemons || pokemons.length === 0) {
      container.innerHTML = '<span class="pokemon-badge">Aucune</span>';
      return;
    }

    let html = "";
    let i;
    for (i = 0; i < pokemons.length; i++) {
      let p = pokemons[i];
      if (!p) continue;
      html =
        html +
        '<a href="details.html?id=' +
        p.id +
        '" class="evolution-card" aria-label="Voir les détails de ' +
        p.name +
        '">' +
        '<img class="evolution-image" src="' +
        p.image +
        '" alt="' +
        p.name +
        '">' +
        '<p class="evolution-name">' +
        p.name +
        "</p>" +
        '<p class="evolution-number">#' +
        pad4(p.id) +
        "</p>" +
        "</a>";
    }

    if (!html)
      container.innerHTML = '<span class="pokemon-badge">Aucune</span>';
    else container.innerHTML = html;
  }

  function idDejaDansListe(list, value) {
    for (let i = 0; i < list.length; i++) {
      if (list[i] === value) return true;
    }
    return false;
  }

  fetchJson("https://pokeapi.co/api/v2/pokemon/" + id)
    .then(function (detail) {
      let backLinkHtml = "";
      let backLink = detailRoot.querySelector("a");
      if (backLink) backLinkHtml = backLink.outerHTML;

      let imgSrc = obtenirImagePokemon(detail);

      let typesHtml = "";
      if (detail.types && Array.isArray(detail.types)) {
        for (let i = 0; i < detail.types.length; i++) {
          let entry = detail.types[i];
          if (entry && entry.type && entry.type.name) {
            typesHtml =
              typesHtml +
              '<span class="pokemon-badge">' +
              entry.type.name +
              "</span>";
          }
        }
      }

      let statsHtml = "";
      if (detail.stats && Array.isArray(detail.stats)) {
        for (let s = 0; s < detail.stats.length; s++) {
          let st = detail.stats[s];
          if (st && st.stat && st.stat.name) {
            statsHtml =
              statsHtml +
              '<span class="pokemon-badge">' +
              st.stat.name +
              ": " +
              st.base_stat +
              "</span>";
          }
        }
      }

      detailRoot.innerHTML =
        backLinkHtml +
        '<article class="pokemon-card">' +
        '<div class="pokemon-card-top">' +
        '<img class="pokemon-image" src="' +
        imgSrc +
        '" alt="' +
        detail.name +
        '">' +
        '<div class="pokemon-content">' +
        '<h3 class="pokemon-title">' +
        detail.name +
        "</h3>" +
        '<p class="pokemon-number">#' +
        pad4(detail.id) +
        "</p>" +
        '<div class="pokemon-badges">' +
        typesHtml +
        "</div>" +
        '<div class="pokemon-description" id="pokemon-description">Chargement...</div>' +
        "</div>" +
        "</div>" +
        '<div class="pokemon-card-bottom">' +
        '<div class="pokemon-stats">' +
        statsHtml +
        "</div>" +
        "</div>" +
        '<div style="width: 100%; margin-top: 14px;">' +
        '<h4 style="margin: 0 0 8px; font-size: 16px;">Évolutions</h4>' +
        '<div id="evolutions-container" class="evolution-cards"><span class="pokemon-badge">Chargement...</span></div>' +
        "</div>" +
        "</article>";

      let evolutionsContainer = document.querySelector("#evolutions-container");
      let descriptionContainer = document.querySelector("#pokemon-description");

      return fetchJson(detail.species.url)
        .then(function (species) {
          if (descriptionContainer) {
            let entries =
              species && Array.isArray(species.flavor_text_entries)
                ? species.flavor_text_entries
                : [];
            let raw = "";
            let enEntry = null;
            for (let i2 = 0; i2 < entries.length; i2++) {
              if (
                entries[i2] &&
                entries[i2].language &&
                entries[i2].language.name === "en" &&
                entries[i2].flavor_text
              ) {
                enEntry = entries[i2];
                break;
              }
            }

            if (enEntry && enEntry.flavor_text) raw = enEntry.flavor_text;
            else if (entries[0] && entries[0].flavor_text)
              raw = entries[0].flavor_text;

            let cleaned = raw ? nettoyerTexteDescription(raw) : "";
            descriptionContainer.textContent =
              cleaned || "Description unavailable.";
          }

          let evolutionChainUrl =
            species && species.evolution_chain
              ? species.evolution_chain.url
              : null;
          if (!evolutionChainUrl || !evolutionsContainer) {
            if (evolutionsContainer) {
              evolutionsContainer.innerHTML =
                '<span class="pokemon-badge">Aucune</span>';
            }
            return null;
          }

          return fetchJson(evolutionChainUrl).then(function (evoData) {
            let chainRoot = evoData ? evoData.chain : null;
            let targetSpeciesName = detail.species ? detail.species.name : null;

            if (!chainRoot || !targetSpeciesName) {
              evolutionsContainer.innerHTML =
                '<span class="pokemon-badge">Aucune</span>';
              return null;
            }

            let path = trouverCheminEvolution(chainRoot, targetSpeciesName);
            if (!path || path.length === 0) {
              evolutionsContainer.innerHTML =
                '<span class="pokemon-badge">Aucune</span>';
              return null;
            }

            let currentNode = path[path.length - 1];
            let ancestors = path;
            let descendants = collecterDescendants(currentNode);

            let evolNodes = [];
            for (let a = 0; a < ancestors.length; a++)
              evolNodes.push(ancestors[a]);
            for (let d = 0; d < descendants.length; d++)
              evolNodes.push(descendants[d]);

            let evolIds = [];
            for (let n = 0; n < evolNodes.length; n++) {
              let node = evolNodes[n];
              let pokemonId = extraireIdDepuisUrl(
                node && node.species ? node.species.url : null,
              );
              if (!pokemonId) continue;
              if (idDejaDansListe(evolIds, pokemonId)) continue;
              evolIds.push(pokemonId);
            }

            let pokemons = [];
            let index = 0;

            function chargerSuivant() {
              if (index >= evolIds.length) {
                rendreEvolutions(evolutionsContainer, pokemons);
                return;
              }

              let pokemonId = evolIds[index];
              index = index + 1;

              chargerArtworkParId(pokemonId)
                .then(function (pokemon) {
                  pokemons.push(pokemon);
                })
                .catch(function (error) {
                  console.error("Erreur:", error);
                })
                .then(function () {
                  chargerSuivant();
                });
            }

            chargerSuivant();
            return null;
          });
        })
        .catch(function (error) {
          console.error("Erreur:", error);
          if (evolutionsContainer) {
            evolutionsContainer.innerHTML =
              '<span class="pokemon-badge">Impossible</span>';
          }
        });
    })
    .catch(function (error) {
      console.error("Erreur:", error);
      detailRoot.textContent = "Impossible de charger ce Pokémon.";
    });
}
