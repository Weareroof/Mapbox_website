mapboxgl.accessToken =
  "pk.eyJ1Ijoid2VhcmVyb29mIiwiYSI6ImNsM2lrOGFxcTAxZGQzY3V3emtlc2Y3ejcifQ.0jyyt8PZQnXeaEjXpNk2zQ";

function createMarkerIcon(imageUrl) {
  const markerIcon = document.createElement("div");
  markerIcon.className = "marker-icon";

  const markerImage = document.createElement("img");
  markerImage.className = "marker-image";
  markerImage.src = imageUrl;
  markerIcon.appendChild(markerImage);

  return markerIcon;
}

//Message pour indiquer d'utiliser deux doigts sur mobile
const message = document.getElementById("two-finger-message");

function showTwoFingerMessage() {
  message.style.display = "flex";

  setTimeout(() => {
    hideTwoFingerMessage();
  }, 800);
}

function hideTwoFingerMessage() {
  message.style.display = "none";
}



fetch("https://node-server-roof-rlx44ukc4q-od.a.run.app/airtable/Roof")
  .then((response) => response.json())
  .then((data) => {
    const isMobile = window.innerWidth <= 768;

    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/weareroof/clh0oknc700if01r024bu6hgp",
      center: [3.05753, 50.631051],
      zoom: 12,
      maxPitch: 0,
      attributionControl: false,
      dragRotate: false,
      dragPan: !isMobile
    });

    if (isMobile) {
      let touchStartTime;
      let twoFingersUsed = false;

      map.on("touchstart", (e) => {
        touchStartTime = new Date().getTime();
        const touch = e.originalEvent.touches[0];
        const elementUnderFinger = document.elementFromPoint(
          touch.clientX,
          touch.clientY
        );

        const clickedOnMarker =
          elementUnderFinger &&
          elementUnderFinger.classList.contains("marker-icon");

        if (e.originalEvent.touches.length > 1) {
          twoFingersUsed = true;
          map.dragPan.enable();
          hideTwoFingerMessage();
        } else if (!clickedOnMarker) {
          twoFingersUsed = false;
          map.dragPan.disable();
        }
      });

      map.on("touchmove", (e) => {
        if (e.originalEvent.touches.length > 1) {
          twoFingersUsed = true;
          map.dragPan.enable();
          hideTwoFingerMessage();
        } else {
          twoFingersUsed = false;
          map.dragPan.disable();
          showTwoFingerMessage();
        }
      });

      map.on("touchend", (e) => {
        if (!twoFingersUsed) {
          const touchEndTime = new Date().getTime();
          const touchDuration = touchEndTime - touchStartTime;

          // Check if the touch duration is less than 200ms
          if (touchDuration < 200) {
            map.dragPan.disable();
          }
        }
      });
    }

    // disable map rotation using right click + drag
    map.dragRotate.disable();
    // disable map rotation using touch rotation gesture
    map.touchZoomRotate.disableRotation();
    // disable map zoom when using scroll
		map.scrollZoom.disable();

    // Add zoom controls to the map
    const navControl = new mapboxgl.NavigationControl({
      showCompass: false
    });
    map.addControl(navControl, "top-right");

    // Masquer le logo Mapbox
    const mapCanvasContainer = document.getElementsByClassName(
      "mapboxgl-ctrl-logo"
    )[0];
    mapCanvasContainer.style.display = "none";

    window.addEventListener("resize", () => {
      map.resize();
    });

    
    //Génerer des marqueurs par Roof
    data.records.forEach((record) => {
      const lat = record.fields["Latitude"];
      const lng = record.fields["Longitude"];

      const imageName = record.fields["Icon_Map"];
      const imageUrl = imageName;

      const marker = new mapboxgl.Marker({
        element: createMarkerIcon(imageUrl),
        anchor: "bottom"
      })
        .setLngLat([lng, lat])
        .addTo(map);

      const popupContent = document.createElement("div");
      const carousel = document.createElement("div");
      carousel.className = "carousel";

      // Add the label to the popupContent
      if (record.fields["Statut"] !== "Prochainement") {
        const label = document.createElement("div");
        label.className = "slider-label";
        label.innerHTML = `<p>${record.fields["Chambre_dispo"]} Places restantes</p>`;
        popupContent.appendChild(label);
      }

      // Vérifiez si le champ "Slider_Roof" existe dans l'enregistrement
      if (record.fields["Slider_Roof"]) {
        // Divisez la chaîne de caractères en un tableau d'URLs en utilisant le séparateur (une virgule)
        const imageUrls = record.fields["Slider_Roof"].split(", ");

        // Parcourez le tableau d'URLs et créez un élément img pour chaque URL
        imageUrls.forEach((imageUrl) => {
          const img = document.createElement("img");
          img.src = imageUrl.trim();
          img.alt = record.fields["Adresse"];
          img.style.maxWidth = "100%";
          img.style.height = "auto";

          const imageLink = document.createElement("a");
          imageLink.href = record.fields["url_slider"]; // Replace with the desired link
          imageLink.target = "_blank"; // Open link in a new tab
          imageLink.appendChild(img);

          carousel.appendChild(imageLink);
        });
      }

      // Créez une nouvelle div pour contenir les éléments h3 et p
      const popupText = document.createElement("div");
      popupText.className = "popup-text";

      popupContent.appendChild(carousel);
      popupContent.appendChild(popupText); // Ajoutez la div popupText à la popupContent

      popupText.innerHTML += `
      <div class="popup_info-wrapper-map">
          <div class="ville-cl__info-col">
              <p class="ville-cl__city">${record.fields["Residences"]}</p>
              <div class="ville-cl__places-wrapper">
                  <p class="ville-cl__places">${record.fields["Statut"]}</p>
              </div>
          </div>
          <div class="ville-cl__info-col">
              <div class="ville-cl__price-wrapper_map">
                  <p class="ville-cl__price typo-small">dès</p>
                  <p class="ville-cl__price ville-cl__price--bold">${record.fields["Prix_min"]}</p>
                  <p class="ville-cl__price">€/mois</p>
              </div>
              <p class="ville-cl__price-text _map">Tout compris</p>
          </div>
      </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        className: "custom-popup"
      }).setDOMContent(popupContent);
      marker.setPopup(popup);

      marker.getElement().addEventListener("click", () => {
        // Apply the custom-popup-bottom class on mobile
        if (window.innerWidth <= 768) {
          const popupContents = document.querySelectorAll(".mapboxgl-popup");
          popupContents.forEach((popupContent) => {
            popupContent.classList.add("custom-popup-bottom");
          });
        } else {
          const popupContents = document.querySelectorAll(
            ".mapboxgl-popup-content"
          );
          popupContents.forEach((popupContent) => {
            popupContent.classList.remove("custom-popup-bottom");
          });
        }

        setTimeout(() => {
            const carouselElement = document.querySelector(".carousel");
            // Only initialize Flickity if there is more than one image
            if (carouselElement.children.length > 1) {
              new Flickity(carouselElement, {
                  cellAlign: "left",
                  contain: true,
                  wrapAround: true,
                  autoPlay: 3000,
                  pauseAutoPlayOnHover: true,
                  imagesLoaded: true,
                  setGallerySize: false,
                  pageDots: false
              });
            }
        }, 0);
      });
    });
  })
  .catch((error) => console.error(error));
