'use strict';

// prettier-ignore


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//Make a parent class
class Workout {
  //we need date
  date = new Date();
  //we need a unique ID, we convert to a string and then get last 10 numbers
  id = (Date.now() + "").slice(10);
  clicks = 0;


  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng] 
    this.distance = distance; //in km
    this.duration = duration; //in min
    
  }
  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }

};

//Make a child class Running
class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
};

//Make a child class Cycling
class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevatGain) {
    super(coords, distance, duration);
    this.elevatGain = elevatGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//const run1 = new Running([39, -12], 5.2, 24, 178);
//const cycling1 = new Cycling([39, -12], 27, 95, 523);

//make a new architecture////////////////////////////////
class App {
  //create private instance properties
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  //All code in constructor is executing  immediately
  constructor() {
    //call the function immediately when the object is created
    this._getPosition();
    //get data from the local storage
    this._getLocalStorage();

    //when user press enter in the form - the marker appear on the map
    form.addEventListener("submit", this._newWorkout.bind(this));
    //when we toggle to cyckling in the form "Cadence" field is changed by "ElevGain"
    inputType.addEventListener("change", this._toggleElevationField.bind(this));
    //add event listener
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    //Get GeoPosition - with 2 callbac functions as a parameter, First - success, Second - error.
    if (navigator.geolocation)
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
      alert("Could not fint your position");
     }
    );
  }

  _loadMap(position) {    
      //get position from the position object
      const {latitude} = position.coords;
      const {longitude} = position.coords;
      const coords = [latitude, longitude];
      //use leaflet website (maps)
      //insert our coords
      this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.#map);        
      //Handling clicks on map 
      this.#map.on("click", this._showForm.bind(this));    

      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
      })
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    //make form on the left visible
    form.classList.remove("hidden");
      //make focuse on distance
    inputDistance.focus();  
  }

  _hideForm() {
    //clear all input in the form after form submit
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => form.style.display = "grid", 1000);
  };

  _toggleElevationField() {
    //seletc closest parent, then change class
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    //function help to validate data
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    //Check if positive
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    //Get data from the form
    const type = inputType.value;
    const distance = inputDistance.value;
    const duration = inputDuration.value;
    const {lat, lng} = this.#mapEvent.latlng;    
    let workout; 

    //If workout running, create running object
    
    if(type === "running") {
      const cadence = +inputCadence.value; //transform to a number
      //Check if data is positive numbers
      
      if(
        //!Number.isFinite(distance) || 
        //!Number.isFinite(duration) || 
        //!Number.isFinite(cadence)
        validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) return alert("Input have to be positive numbers");
      //Create object
      workout = new Running([lat, lng], distance, duration, cadence);       
    } 

    //If workout cycling, create cycling object
    if(type === "cycling") {
      const elevation = +inputElevation.value; //transform to a number
      //check      
      if(validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert("Input have to be positive numbers");
       //Create object
       workout = new Cycling([lat, lng], distance, duration, elevation);     
    }

    //Add new object to workout array
    this.#workouts.push(workout);   

    //Render workout on map as marker     
    this._renderWorkoutMarker(workout);

    //Render workout on list 
    this._renderWorkout(workout)
    
    //Hide form + clear input fields
    this._hideForm();    

    //Set a local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords).addTo(this.#map)
    .bindPopup(L.popup({maxWidth: 250, minWidth: 100, autoClose: false, closeOnClick: false, className: `${workout.type}-popup`}))
    .setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`)
    .openPopup(); 
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>    
        `;

        if (workout.type === "running") {
          html += `
              <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
          </li>          
          `;
        }

        if(workout.type === "cycling") {
          html += `            
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevatGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> -->         
          `;
        }
    //insert workouts to the list
    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    //if click any place, not a popup - ignore this click
    if(!workoutEl) return;
    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);   
    
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {duration: 1,}
    })
    //Using the publick interface
    //workout.click();
  }
  //set local storage
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts))

  }
  //get data from the local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    //check if there is data in the local storage
    if(!data) return;
    //restore data
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    })
  }
  //clean local storage
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
};

//Create an object
const app = new App();


