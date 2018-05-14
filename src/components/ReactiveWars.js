import React, { Component } from 'react';
import Styles from './ReactiveWarsStyles';
import { Subject, empty, of } from 'rxjs';
import {
  flatMap,
  map,
  distinctUntilChanged,
  filter,
  catchError
} from 'rxjs/operators';
let makeCallStream = new Subject();
let prefButtonStream = new Subject();
let inputStream = new Subject();
let peopleStream = new Subject();
let planetStream = new Subject();
let vehicleStream = new Subject();
let getDataStream = new Subject();

class ReactiveWars extends Component {
  constructor(props) {
    super(props);
    this.state = {
      prefStatus: [{ people: true }, { planets: false }, { vehicles: false }],
      searchText: '',
      data: {
        people: { count: 0, dataArray: [] },
        vehicles: { count: 0, dataArray: [] },
        planets: { count: 0, dataArray: [] }
      }
    };
  }
  componentDidMount() {
    this.initializeSearchStream();
    this.initializePrefButtonStream();
    this.initializeInputStream();
    this.initializeDataStreams();
  }
  initializeSearchStream() {
    makeCallStream
      .pipe(
        filter(val => this.state.searchText !== ''),
        map(val => {
          return val.value;
        }),
        flatMap(val => {
          let arr = [];
          this.state.prefStatus.map((item, index) => {
            if (item[Object.keys(item)[0]]) {
              arr.push({ pref: item, text: val });
            }
          });
          return of(arr);
        })
      )
      .subscribe(val => {
        val.map((item, index) => {
          switch (Object.keys(item.pref)[0]) {
            case 'people':
              peopleStream.next({ searchText: item.text });
              break;
            case 'planets':
              planetStream.next({ searchText: item.text });
              break;
            case 'vehicles':
              vehicleStream.next({ searchText: item.text });
              break;
          }
        });
      });
  }
  initializePrefButtonStream() {
    prefButtonStream
      .pipe(
        filter(button => {
          let count = 0;
          button.prefStatus.map(
            (item, index) => (item[Object.keys(item)[0]] ? count++ : undefined)
          );
          return count > 1 ? true : button.status ? false : true;
        }),
        filter(button => this.state.searchText !== '')
      )
      .subscribe(button => {
        this.state.prefStatus[button.index][button.pref] = !this.state
          .prefStatus[button.index][button.pref];
        this.setState(
          {
            prefStatus: this.state.prefStatus
          },
          () => makeCallStream.next({ value: this.state.searchText })
        );
      });
  }
  initializeInputStream() {
    inputStream.subscribe(val => {
      this.setState({
        searchText: val.value
      });
    });
  }
  initializeDataStreams() {
    peopleStream
      .pipe(map(val => val.searchText), distinctUntilChanged())
      .subscribe(val => {
        getDataStream.next({ searchText: val, pref: 'people' });
      });
    planetStream
      .pipe(map(val => val.searchText), distinctUntilChanged())
      .subscribe(val =>
        getDataStream.next({ searchText: val, pref: 'planets' })
      );
    vehicleStream
      .pipe(map(val => val.searchText), distinctUntilChanged())
      .subscribe(val =>
        getDataStream.next({
          searchText: val,
          pref: 'vehicles'
        })
      );
    getDataStream
      .pipe(
        flatMap(val => {
          console.log('getting new data', val);
          let outVal = val;
          return fetch(
            `https://swapi.co/api/${val.pref}/?search=${val.searchText}`
          )
            .then(val => val.json())
            .then(val => of({ pref: outVal.pref, res: val })); // Pasing data downstream for later use
        }),
        catchError(err => {
          return empty();
        })
      )
      .subscribe(val => {
        this.setState({
          data: {
            ...this.state.data,
            [val.value.pref]: {
              count: val.value.res.count,
              dataArray: val.value.res.results
            }
          }
        });
      });
  }
  renderButtons(button) {
    return (
      <button
        key={button.id}
        onClick={e =>
          prefButtonStream.next({
            prefStatus: this.state.prefStatus,
            status: button.status,
            pref: button.name,
            searchText: this.state.searchText,
            index: button.id
          })
        }
        style={{
          ...Styles.prefBut,
          ...{ background: button.status ? 'yellow' : undefined }
        }}
      >
        {button.name}
      </button>
    );
  }
  render() {
    return (
      <div>
        <div style={Styles.blackDiv}>
          <h1 style={{ color: 'yellow', marginLeft: 40 }}>ReactiveWars</h1>
          <div style={{ flexDirection: 'row' }}>
            {this.state.prefStatus.map((item, index) => {
              return this.renderButtons({
                id: index,
                name: Object.keys(item)[0],
                status: item[Object.keys(item)[0]]
              });
            })}
          </div>
          <div style={{ flexDirection: 'row' }}>
            <input
              style={Styles.inputBox}
              placeholder={'Search...'}
              onChange={e => inputStream.next({ value: e.target.value })}
            />
            <button
              style={Styles.searchBut}
              onClick={e =>
                makeCallStream.next({ value: this.state.searchText })
              }
            >
              Search
            </button>
          </div>
        </div>
        <h1>Data</h1>
        <div style={{ flexDirection: 'row', width: '100%' }}>
          <div
            style={{
              flex: 1,
              marginLeft: 80,
              width: 300,
              display: 'inline-block',
              background: 'yellow'
            }}
          >
            <pre>People: {this.state.data.people.count}</pre>
            {this.state.data.people.dataArray.map((item, index) => {
              return <pre key={index}>{item.name}</pre>;
            })}
          </div>
          <div
            style={{
              flex: 1,
              marginLeft: 80,
              width: 300,
              display: 'inline-block',
              background: 'yellow'
            }}
          >
            <pre>Planets: {this.state.data.planets.count}</pre>
            {this.state.data.planets.dataArray.map((item, index) => {
              return <pre key={index}>{item.name}</pre>;
            })}
          </div>
          <div
            style={{
              flex: 1,
              marginLeft: 80,
              width: 300,
              display: 'inline-block',
              background: 'yellow'
            }}
          >
            <pre>Vehicles: {this.state.data.vehicles.count}</pre>
            {this.state.data.vehicles.dataArray.map((item, index) => {
              return <pre key={index}>{item.name}</pre>;
            })}
          </div>
        </div>
        <pre>{JSON.stringify(this.state.data, null, 4)}</pre>
      </div>
    );
  }
}

export default ReactiveWars;
