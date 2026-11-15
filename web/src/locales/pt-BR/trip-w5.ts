// Brazilian Portuguese for the trip controls of the simulator page (web/src/pages/Simulator.tsx and
// web/src/trip/TripControls.tsx). The key is the English text.
export const tripW5: Record<string, string> = {
  // The tabs and the sticky bar.
  'The page that the simulator controls': 'A página que o simulador controla',
  Trip: 'Viagem',
  'The server has no trip settings yet': 'O servidor ainda não tem as configurações da viagem',
  'The trip controls show here when the server sends the trip settings. Start the newest server, then load this page again.':
    'Os controles da viagem aparecem aqui quando o servidor envia as configurações da viagem. Inicie o servidor mais novo e carregue esta página de novo.',
  'Open the trip page': 'Abrir a página da viagem',
  'Day {day} of {days}': 'Dia {day} de {days}',

  // The small controls.
  On: 'Ligado',
  '{name}: less': '{name}: menos',
  '{name}: more': '{name}: mais',
  '{min} to {max}': '{min} a {max}',

  // The mission.
  Mission: 'Missão',
  'Low Earth orbit': 'Órbita baixa da Terra',
  Moon: 'Lua',
  Mars: 'Marte',
  'A new mission starts at day 0 with its first settings. The comparison and the speed stay.':
    'Uma nova missão começa no dia 0 com as suas primeiras configurações. A comparação e a velocidade ficam.',
  'The trip page is at /trip. Open it on the screen for the audience.': 'A página da viagem fica em /trip. Abra-a na tela para o público.',

  // The mission day.
  'Mission day': 'Dia da missão',
  'of {count} day': 'de {count} dia',
  'of {count} days': 'de {count} dias',
  'Cabin time': 'Hora da cabine',
  'Step by a day or an hour': 'Avançar ou voltar um dia ou uma hora',
  'Forward by {time}': 'Avançar {time}',
  'Back by {time}': 'Voltar {time}',
  'Trip clock': 'Relógio da viagem',
  '{count} minute each second': '{count} minuto a cada segundo',
  '{count} minutes each second': '{count} minutos a cada segundo',
  '{count} hour each second': '{count} hora a cada segundo',
  '{count} hours each second': '{count} horas a cada segundo',
  '{count} day each second': '{count} dia a cada segundo',
  '{count} days each second': '{count} dias a cada segundo',
  'Go to the start of a phase': 'Ir para o início de uma fase',
  'day {day}': 'dia {day}',

  // The radiation.
  Radiation: 'Radiação',
  'Solar cycle of the flight. It selects the instrument of the dose rate.': 'Ciclo solar do voo. Ele seleciona o instrumento da taxa de dose.',
  'Solar cycle of the flight': 'Ciclo solar do voo',
  'Near solar maximum (MSL RAD)': 'Perto do máximo solar (MSL RAD)',
  'Declining phase (Liulin-MO)': 'Fase de declínio (Liulin-MO)',
  'Unit of the charts. The two units are different quantities, so the page never adds them.':
    'Unidade dos gráficos. As duas unidades são grandezas diferentes, por isso a página nunca as soma.',
  'Unit of the charts': 'Unidade dos gráficos',
  'dose equivalent': 'equivalente de dose',
  'absorbed dose': 'dose absorvida',
  'Solar storm': 'Tempestade solar',
  'What-if scenario. Nobody can forecast the date of a solar particle event.': 'Cenário hipotético. Ninguém consegue prever a data de um evento de partículas solares.',
  'Extra dose of the storm': 'Dose extra da tempestade',
  'Length of the storm': 'Duração da tempestade',
  hours: 'horas',
  'Add a storm at this mission day': 'Adicionar uma tempestade neste dia da missão',
  'The mission has {count} storms, which is the most that the page takes. Remove one to add another.':
    'A missão tem {count} tempestades, que é o máximo que a página aceita. Remova uma para adicionar outra.',
  'The storm starts at day {day}. The page takes at most {count} storms.': 'A tempestade começa no dia {day}. A página aceita no máximo {count} tempestades.',
  'Storms of this mission': 'Tempestades desta missão',
  'Day {day}': 'Dia {day}',
  'Remove the storm of day {day}': 'Remover a tempestade do dia {day}',
  Remove: 'Remover',
  'Remove all storms': 'Remover todas as tempestades',

  // The mission plan.
  'Mission plan': 'Plano da missão',
  'Surface stay': 'Estadia na superfície',
  'Surface stay in days': 'Estadia na superfície em dias',
  '{min} to {max} days. The preset has {value}.': '{min} a {max} dias. A missão predefinida tem {value}.',
  'Return flight': 'Voo de volta',
  'Length of the flight': 'Duração do voo',
  days: 'dias',
  'Dose rate': 'Taxa de dose',
  '{unit} each day': '{unit} por dia',
  'Unit of the dose rate': 'Unidade da taxa de dose',
  'The custom mission uses your numbers. They are not from a source.': 'A missão personalizada usa os seus números. Eles não vêm de uma fonte.',

  // The crew and the cabin.
  'Crew and cabin': 'Tripulação e cabine',
  'The preset has {value} m³ ({name}) and a crew of {crew}.': 'A missão predefinida tem {value} m³ ({name}) e {crew} tripulantes.',
  'The preset has {value} m³ and a crew of {crew}.': 'A missão predefinida tem {value} m³ e {crew} tripulantes.',
  'Metabolic numbers: the CO2 that a person makes and the O2 that a person uses': 'Números metabólicos: o CO2 que uma pessoa produz e o O2 que uma pessoa usa',
  'Metabolic numbers': 'Números metabólicos',
  'NASA handbook rates by activity': 'Taxas do manual da NASA por atividade',
  '1.08 kg of CO2 with 90 minutes of exercise': '1,08 kg de CO2 com 90 minutos de exercício',
  'Daily schedule': 'Rotina diária',
  'Sleep starts at': 'O sono começa às',
  'Hours of sleep': 'Horas de sono',
  'Exercise sessions each day': 'Sessões de exercício por dia',
  'Minutes of one session': 'Minutos de uma sessão',
  'No exercise.': 'Sem exercício.',
  'Exercise starts at {times}. Total: {minutes} minutes each day.': 'O exercício começa às {times}. Total: {minutes} minutos por dia.',
  'All crew members have the same day. The page spreads the sessions over the waking time.':
    'Todos os tripulantes têm o mesmo dia. A página distribui as sessões pelo tempo acordado.',

  // The life support systems.
  'Life support systems': 'Sistemas de suporte de vida',
  'A failure starts at the mission day of the cursor. Before that day, the cabin has the normal settings of the mission.':
    'Uma falha começa no dia da missão do cursor. Antes desse dia, a cabine tem as configurações normais da missão.',
  'Changed on day {day}': 'Alterado no dia {day}',
  'The settings apply from day 0.': 'As configurações valem desde o dia 0.',
  'CO2 scrubber. It removes the CO2 from the cabin air.': 'Removedor de CO2. Ele remove o CO2 do ar da cabine.',
  'CO2 scrubber': 'Removedor de CO2',
  'Oxygen generator': 'Gerador de oxigênio',
  'O2 that the generator makes': 'O2 que o gerador produz',
  Automatic: 'Automático',
  'Set a rate': 'Definir uma taxa',
  'Rate of the generator': 'Taxa do gerador',
  'Automatic: the generator makes as much O2 as the crew uses.': 'Automático: o gerador produz tanto O2 quanto a tripulação usa.',
  'O2 in bottles. The cabin uses it when the generator is off.': 'O2 em cilindros. A cabine usa esse O2 quando o gerador está desligado.',
  'Sabatier reactor': 'Reator Sabatier',
  'The Sabatier reactor makes water from CO2 and hydrogen. It changes how much of the O2 comes back, not the gas in the cabin.':
    'O reator Sabatier produz água a partir de CO2 e hidrogênio. Ele muda quanto do O2 volta, não o gás da cabine.',
  'All systems back to normal': 'Todos os sistemas de volta ao normal',

  // The comparison.
  Compare: 'Comparar',
  '{count} of {max} chosen': '{count} de {max} escolhidas',
  'Choose {min} to {max} missions for the comparison chart.': 'Escolha de {min} a {max} missões para o gráfico de comparação.',
  'Missions of the comparison chart': 'Missões do gráfico de comparação',
}
