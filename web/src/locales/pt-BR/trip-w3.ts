// Brazilian Portuguese for the radiation card, the communication delay card, the comparison card,
// and the badge of the trip page. The key is the English text.
export const tripW3: Record<string, string> = {
  // Units and small texts that the cards share.
  'mSv (dose equivalent)': 'mSv (dose equivalente)',
  'mGy (absorbed dose)': 'mGy (dose absorvida)',
  '{value} s': '{value} s',
  '{minutes} min {seconds} s': '{minutes} min {seconds} s',
  'no data': 'sem dados',
  'No data': 'Sem dados',
  'Day {day}': 'Dia {day}',
  'day {day}': 'dia {day}',
  'day {from} to day {to}': 'do dia {from} ao dia {to}',
  'Cursor: day {day}': 'Cursor: dia {day}',
  'From the start to day {day}': 'Do início até o dia {day}',

  // The badge.
  'REAL DATA': 'DADOS REAIS',
  'A measured series: each value comes from an instrument of this mission.': 'Uma série medida: cada valor vem de um instrumento desta missão.',
  'REAL RATE (published mean)': 'TAXA REAL (média publicada)',
  'A mean that the source published for a real measurement. The page uses it as a constant rate.': 'Uma média que a fonte publicou para uma medição real. A página usa essa média como uma taxa constante.',
  MODELLED: 'MODELADO',
  'Computed by the model of this app. No instrument measured it.': 'Calculado pelo modelo deste app. Nenhum instrumento mediu este valor.',
  PROXY: 'SUBSTITUTO',
  'A real value from another mission. The page uses it because this mission has no value of its own.': 'Um valor real de outra missão. A página usa esse valor porque esta missão não tem um valor próprio.',
  'REAL TRAJECTORY + PROXY': 'TRAJETÓRIA REAL + SUBSTITUTO',
  'The path is the real trajectory of the mission. The dose rate is a real value from another mission.': 'O caminho é a trajetória real da missão. A taxa de dose é um valor real de outra missão.',
  'REAL RATE + MODELLED': 'TAXA REAL + MODELADO',
  'The dose rate is a published mean of a real measurement. The model of this app computes the rest.': 'A taxa de dose é uma média publicada de uma medição real. O modelo deste app calcula o resto.',
  'This source has no link yet.': 'Esta fonte ainda não tem link.',
  'More about this value': 'Mais sobre este valor',

  // The radiation card: the values at the cursor.
  'Radiation dose': 'Dose de radiação',
  'Unit:': 'Unidade:',
  'Unit of the dose': 'Unidade da dose',
  'Dose rate on day {day}': 'Taxa de dose no dia {day}',
  '{unit} each day': '{unit} por dia',
  '{value} {unit} each day': '{value} {unit} por dia',
  'This day has a part of a what-if storm.': 'Este dia tem uma parte de uma tempestade hipotética.',
  'Total dose from the start to day {day}': 'Dose total do início até o dia {day}',
  'A phase before this day has no checked value, so the page cannot give a total.': 'Uma fase antes deste dia não tem um valor verificado, por isso a página não pode dar um total.',
  '{percent}% of the career limit of {limit} mSv': '{percent}% do limite de carreira de {limit} mSv',
  'The career limit is {limit} mSv.': 'O limite de carreira é de {limit} mSv.',
  'Dose equivalent (mSv) and absorbed dose (mGy) are different quantities. The page converts nothing: each value is the value that the source gives in this unit.':
    'Dose equivalente (mSv) e dose absorvida (mGy) são grandezas diferentes. A página não converte nada: cada valor é o valor que a fonte dá nesta unidade.',
  'The source gives this rate only in {other}. The page converts nothing, so this phase has no value in {unit}.':
    'A fonte dá esta taxa só em {other}. A página não converte nada, por isso esta fase não tem valor em {unit}.',
  'We found no value for this phase that we could check.': 'Não encontramos para esta fase um valor que pudéssemos verificar.',

  // The radiation card: the phase of the cursor.
  'Phase now: {phase}': 'Fase atual: {phase}',
  'Rate of this phase': 'Taxa desta fase',
  Instrument: 'Instrumento',
  Shielding: 'Blindagem',
  'Solar cycle at the measurement': 'Ciclo solar na medição',
  Proxy: 'Substituto',
  'Proxy of {mission}: the value comes from that mission, not from this one.': 'Substituto de {mission}: o valor vem daquela missão, não desta.',
  'What the source says': 'O que a fonte diz',
  Note: 'Nota',
  'Solar-cycle setting:': 'Ajuste do ciclo solar:',
  'Near solar maximum': 'Perto do máximo solar',
  'Declining phase of the solar cycle': 'Fase de declínio do ciclo solar',
  'The flight phases use the rate of {instrument} ({shielding}).': 'As fases de voo usam a taxa de {instrument} ({shielding}).',

  // The radiation card: the two charts.
  'Dose for each day, in {unit}': 'Dose de cada dia, em {unit}',
  'WHAT-IF STORM': 'TEMPESTADE HIPOTÉTICA',
  storm: 'tempestade',
  'With a what-if storm': 'Com uma tempestade hipotética',
  'Dose of the day': 'Dose do dia',
  'Start of a phase': 'Início de uma fase',
  'What-if storm': 'Tempestade hipotética',
  'What-if storm on day {day}: +{dose} in {hours} h.': 'Tempestade hipotética no dia {day}: +{dose} em {hours} h.',
  'The storm days are far above the other days. The scale of this chart fits the days with no storm, so the line leaves the chart at a storm.':
    'Os dias de tempestade ficam muito acima dos outros dias. A escala deste gráfico se ajusta aos dias sem tempestade, por isso a linha sai do gráfico em uma tempestade.',
  '(the phase of the cursor)': '(a fase do cursor)',
  'Total dose over the mission, in {unit}': 'Dose total ao longo da missão, em {unit}',
  '{percent}% of the career limit': '{percent}% do limite de carreira',
  'No data: the first phase of this mission has no checked value in {unit}, so the page cannot give a total.':
    'Sem dados: a primeira fase desta missão não tem um valor verificado em {unit}, por isso a página não pode dar um total.',
  'Total dose': 'Dose total',
  '{limit} mSv: career limit': '{limit} mSv: limite de carreira',
  'The total passes the limit': 'O total passa do limite',
  'No data for the phase "{phase}".': 'Sem dados para a fase "{phase}".',
  'The career limit is a dose equivalent in mSv. This chart shows the absorbed dose in mGy, so it has no limit line.':
    'O limite de carreira é uma dose equivalente em mSv. Este gráfico mostra a dose absorvida em mGy, por isso não tem a linha do limite.',
  'The total passes the career limit of {limit} mSv on day {day}.': 'O total passa do limite de carreira de {limit} mSv no dia {day}.',
  'The total is not complete: it stops on day {day} at {percent}% of the career limit of {limit} mSv. The days with no data add an unknown dose.':
    'O total não está completo: ele para no dia {day} em {percent}% do limite de carreira de {limit} mSv. Os dias sem dados somam uma dose desconhecida.',
  'The total stays below the career limit of {limit} mSv: {percent}% at the end.': 'O total fica abaixo do limite de carreira de {limit} mSv: {percent}% no fim.',
  'The limit is far above this chart, so the chart has no limit line.': 'O limite fica muito acima deste gráfico, por isso o gráfico não tem a linha do limite.',

  // The radiation card: the notes.
  'What to know about these numbers': 'O que saber sobre estes números',
  'A storm is a what-if scenario, not a forecast. Nobody can forecast when a solar particle event starts or how strong it is.':
    'Uma tempestade é um cenário hipotético, não uma previsão. Ninguém consegue prever quando um evento de partículas solares começa nem a sua força.',
  'The dose rate of the flight is flat on purpose. It changes very little between 1 and 1.5 AU from the Sun. 1 AU is the distance from the Sun to the Earth.':
    'A taxa de dose do voo é constante de propósito. Ela muda muito pouco entre 1 e 1,5 UA do Sol. 1 UA é a distância do Sol à Terra.',

  // The communication delay card.
  'Communication delay': 'Atraso de comunicação',
  'The time that a radio signal needs between the Earth and the spacecraft.': 'O tempo que um sinal de rádio leva entre a Terra e a nave.',
  'One-way light time on day {day}': 'Tempo de luz de ida no dia {day}',
  'Two ways': 'Ida e volta',
  'Distance from the Earth': 'Distância da Terra',
  '{million} million km ({au} AU)': '{million} milhões de km ({au} UA)',
  '{km} km': '{km} km',
  'light time = distance ÷ speed of light (299,792.458 km each second)': 'tempo de luz = distância ÷ velocidade da luz (299.792,458 km por segundo)',
  'The distance is from the centre of the Earth to the spacecraft. A radio signal moves at the speed of light.': 'A distância é do centro da Terra até a nave. Um sinal de rádio viaja na velocidade da luz.',
  'The model of this app made the place of the spacecraft on this day. It is not from a real trajectory.': 'O modelo deste app calculou a posição da nave neste dia. Ela não vem de uma trajetória real.',
  'A talk with the ground is as on the Earth: the signal needs less than 1 second.': 'Uma conversa com o solo é como na Terra: o sinal leva menos de 1 segundo.',
  'Ground support delayed {oneWay}: a question and its answer need {twoWay}.': 'Apoio do solo com atraso de {oneWay}: uma pergunta e a sua resposta levam {twoWay}.',
  'The crew must work without the ground in this time.': 'A tripulação precisa trabalhar sem o solo durante esse tempo.',
  'One-way light time over the mission, in minutes': 'Tempo de luz de ida ao longo da missão, em minutos',
  'One-way light time over the mission, in seconds': 'Tempo de luz de ida ao longo da missão, em segundos',
  'two ways: {time}': 'ida e volta: {time}',
  'Place from the model of this app': 'Posição do modelo deste app',
  'Place from the real trajectory': 'Posição da trajetória real',
  'No data: this mission has no path for the chart.': 'Sem dados: esta missão não tem um caminho para o gráfico.',
  'Real trajectory': 'Trajetória real',
  'Modelled path': 'Caminho modelado',

  // The comparison card.
  'Compare missions': 'Comparar missões',
  'Total dose in {unit}, by mission day.': 'Dose total em {unit}, por dia de missão.',
  'Missions on the chart ({count} of {most})': 'Missões no gráfico ({count} de {most})',
  'The chart has room for 3 missions. Remove one to add another.': 'O gráfico tem lugar para 3 missões. Remova uma para adicionar outra.',
  'Choose up to 3 missions. One mission always stays.': 'Escolha até 3 missões. Uma missão sempre fica.',
  'no value': 'sem valor',
  'No data: no selected mission has a total in {unit}.': 'Sem dados: nenhuma missão selecionada tem um total em {unit}.',
  '{total} up to day {day}. Not complete: the days after it have no data.': '{total} até o dia {day}. Incompleto: os dias depois dele não têm dados.',
  '{total} at the end of the mission (day {day})': '{total} no fim da missão (dia {day})',
  'Not on this chart': 'Fora deste gráfico',
  'The missions differ in shielding, in instrument, and in the state of the solar cycle. So the lines show what each instrument measured, not which trip is safer.':
    'As missões diferem na blindagem, no instrumento e no estado do ciclo solar. Por isso as linhas mostram o que cada instrumento mediu, não qual viagem é mais segura.',

  // The reasons of compareDose() in shared/trip/radiation.ts. The comparison card shows them with t().
  'The values of this mission are in mSv (dose equivalent). This chart shows mGy (absorbed dose).': 'Os valores desta missão estão em mSv (dose equivalente). Este gráfico mostra mGy (dose absorvida).',
  'The values of this mission are in mGy (absorbed dose). This chart shows mSv (dose equivalent).': 'Os valores desta missão estão em mGy (dose absorvida). Este gráfico mostra mSv (dose equivalente).',
  'This mission has no values in mSv (dose equivalent).': 'Esta missão não tem valores em mSv (dose equivalente).',
  'This mission has no values in mGy (absorbed dose).': 'Esta missão não tem valores em mGy (dose absorvida).',
  'The first days of this mission have no value in mSv (dose equivalent), so the chart cannot show a total.': 'Os primeiros dias desta missão não têm valor em mSv (dose equivalente), por isso o gráfico não pode mostrar um total.',
  'The first days of this mission have no value in mGy (absorbed dose), so the chart cannot show a total.': 'Os primeiros dias desta missão não têm valor em mGy (dose absorvida), por isso o gráfico não pode mostrar um total.',
}
