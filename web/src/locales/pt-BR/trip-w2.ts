// Brazilian Portuguese for the map of a mission and the timeline (web/src/trip/TripMap.tsx, Timeline.tsx).
// The key is the English text.
export const tripW2: Record<string, string> = {
  // Numbers with units.
  '{n} million km': '{n} milhões de km',
  '{n} km': '{n} km',
  '{n} s': '{n} s',
  '{min} min {sec} s': '{min} min {sec} s',
  '{deg}° N': '{deg}° N',
  '{deg}° S': '{deg}° S',
  '{deg}° E': '{deg}° L',
  '{deg}° W': '{deg}° O',
  '{count} day': '{count} dia',
  '{count} days': '{count} dias',
  'Day {day} of {days}': 'Dia {day} de {days}',
  'Day {day}': 'Dia {day}',

  // The marks of the map.
  Sun: 'Sol',
  Earth: 'Terra',
  Mars: 'Marte',
  Moon: 'Lua',
  Spacecraft: 'Nave',
  Station: 'Estação',
  'South Atlantic Anomaly': 'Anomalia do Atlântico Sul',
  'light time {time}': 'tempo de luz {time}',

  // The text alternative of the map.
  'Map of the Earth with the ground track of the station.': 'Mapa da Terra com o traçado da estação sobre o solo.',
  'Map of the flight, with the Earth in the middle.': 'Mapa do voo, com a Terra no centro.',
  'Map of the flight, with the Sun in the middle.': 'Mapa do voo, com o Sol no centro.',
  'No trajectory data.': 'Sem dados de trajetória.',
  '{day}, phase: {phase}.': '{day}, fase: {phase}.',
  'The station is over {where}.': 'A estação está sobre {where}.',
  'It is inside the South Atlantic Anomaly.': 'Ela está dentro da Anomalia do Atlântico Sul.',
  'It is outside the South Atlantic Anomaly.': 'Ela está fora da Anomalia do Atlântico Sul.',
  'The spacecraft is {distance} from the Earth.': 'A nave está a {distance} da Terra.',
  'The light time for one way is {time}.': 'O tempo de luz de ida é de {time}.',
  'Our model made this part of the path.': 'Nosso modelo fez esta parte do trajeto.',

  // The state with no data.
  'No trajectory data': 'Sem dados de trajetória',
  'The map shows the path when the data is here.': 'O mapa mostra o trajeto quando os dados chegarem.',

  // The line below the map, the legend, and the notes.
  '{distance} from the Earth': '{distance} da Terra',
  'inside the South Atlantic Anomaly': 'dentro da Anomalia do Atlântico Sul',
  'outside the South Atlantic Anomaly': 'fora da Anomalia do Atlântico Sul',
  modelled: 'modelado',
  'Path flown': 'Trajeto percorrido',
  'Path ahead': 'Trajeto à frente',
  'Modelled: our model made this part': 'Modelado: nosso modelo fez esta parte',
  'Inside the South Atlantic Anomaly': 'Dentro da Anomalia do Atlântico Sul',
  'Radio link to the Earth, with the light time for one way': 'Enlace de rádio com a Terra, com o tempo de luz de ida',
  'The Sun, the Earth, and Mars are drawn larger than their real size.': 'O Sol, a Terra e Marte estão desenhados maiores que o tamanho real.',
  'The Earth and the Moon are drawn larger than their real size.': 'A Terra e a Lua estão desenhadas maiores que o tamanho real.',
  'The map shows about the last orbit and the next two orbits of the track.': 'O mapa mostra cerca da última órbita e das duas próximas órbitas do traçado.',
  'Made with Natural Earth.': 'Feito com Natural Earth.',

  // The timeline.
  'No mission phases': 'Sem fases da missão',
  'Mission day': 'Dia da missão',
  'Mission timeline. {where}': 'Linha do tempo da missão. {where}',
  '{phase}: day {from} to day {to}': '{phase}: do dia {from} ao dia {to}',
  'Solar storm (a what-if scenario) on day {day}, for {hours} hours': 'Tempestade solar (um cenário hipotético) no dia {day}, por {hours} horas',
  'Solar storm (a what-if scenario): day {days}': 'Tempestade solar (um cenário hipotético): dia {days}',
  'Solar storms (what-if scenarios): days {days}': 'Tempestades solares (cenários hipotéticos): dias {days}',
  'The dose passes the career limit on day {day}': 'A dose passa do limite de carreira no dia {day}',
}
