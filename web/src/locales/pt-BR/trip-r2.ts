// Brazilian Portuguese for the texts of the Mars, ISS, and custom presets
// (shared/trip/presets/msl.ts, tgo.ts, mars-reference.ts, iss.ts, custom.ts) and of the career
// limit (shared/trip/limits.ts).
// The key is the English text, word for word. Names of papers and of data sources stay as they are.
export const tripR2: Record<string, string> = {
  'Mars: MSL/Curiosity cruise':
    'Marte: viagem da MSL/Curiosity',
  'The flight that took the Curiosity rover to Mars, from 26 November 2011 to 6 August 2012. The RAD instrument measured the radiation inside the spacecraft on the way.':
    'O voo que levou o rover Curiosity a Marte, de 26 de novembro de 2011 a 6 de agosto de 2012. O instrumento RAD mediu a radiação dentro da nave no caminho.',
  'The real path of the spacecraft from JPL Horizons, from the launch on 26 November 2011 to the landing on 6 August 2012, with the places of the Earth and Mars.':
    'A trajetória real da nave, do JPL Horizons, do lançamento em 26 de novembro de 2011 ao pouso em 6 de agosto de 2012, com as posições da Terra e de Marte.',
  'Cruise to Mars':
    'Viagem até Marte',
  'RAD measured from 6 December 2011 to 14 July 2012. The rate is the mean for galactic cosmic rays. Five solar particle events added 24.7 mSv in total, about 5% of the dose of the cruise.':
    'O RAD mediu de 6 de dezembro de 2011 a 14 de julho de 2012. A taxa é a média dos raios cósmicos galácticos. Cinco eventos de partículas solares somaram 24,7 mSv no total, cerca de 5% da dose da viagem.',
  'Inside the spacecraft, on the Curiosity rover. The shielding was not even: about 16 g/cm² as a mean over all directions, and less than 5 g/cm² for about 30% of the sky above the instrument.':
    'Dentro da nave, no rover Curiosity. A blindagem não era uniforme: cerca de 16 g/cm² na média de todas as direções, e menos de 5 g/cm² em cerca de 30% do céu acima do instrumento.',
  'Rise and maximum of solar cycle 24, which was a very weak maximum (December 2011 to July 2012).':
    'Subida e máximo do ciclo solar 24, que foi um máximo muito fraco (dezembro de 2011 a julho de 2012).',
  'In cruise, the dose equivalent rate from galactic cosmic rays was 1.84 ± 0.33 mSv for each day. The absorbed dose rate of the same measurement was 0.481 ± 0.080 mGy for each day, and the mean quality factor was 3.82 ± 0.25.':
    'Na viagem, a taxa de dose equivalente dos raios cósmicos galácticos foi de 1,84 ± 0,33 mSv por dia. A taxa de dose absorvida da mesma medição foi de 0,481 ± 0,080 mGy por dia, e o fator de qualidade médio foi de 3,82 ± 0,25.',
  'The absorbed dose rate from galactic cosmic rays in cruise was 0.481 ± 0.080 mGy for each day, as dose in water (converted from the silicon detector). In the silicon detector itself it was 0.332 ± 0.023 mGy for each day.':
    'A taxa de dose absorvida dos raios cósmicos galácticos na viagem foi de 0,481 ± 0,080 mGy por dia, como dose na água (convertida a partir do detector de silício). No próprio detector de silício, foi de 0,332 ± 0,023 mGy por dia.',
  'NASA Mars transit habitat (design study of 2015)':
    'Habitat de trânsito para Marte da NASA (estudo de projeto de 2015)',
  'The air volume of the cabin is the habitable volume of the design: 100 m³ for a crew of 4 (25 m³ for each person). The pressurized volume of the design is 210.7 m³, but equipment and stores fill a part of it. NASA gives no free air volume.':
    'O volume de ar da cabine é o volume habitável do projeto: 100 m³ para 4 tripulantes (25 m³ por pessoa). O volume pressurizado do projeto é de 210,7 m³, mas equipamentos e suprimentos ocupam uma parte dele. A NASA não dá um volume de ar livre.',
  'For the shortest round trip to Mars with the propulsion of today and with shielding like that of MSL, the paper gives a dose equivalent of 0.66 ± 0.12 Sv.':
    'Para a viagem de ida e volta mais curta a Marte com a propulsão de hoje e com uma blindagem como a da MSL, o artigo dá uma dose equivalente de 0,66 ± 0,12 Sv.',
  'RAD saw five solar particle events in the cruise. Together they gave 24.7 mSv, about 5% of the dose equivalent of the cruise (about 466 mSv).':
    'O RAD viu cinco eventos de partículas solares na viagem. Juntos, eles deram 24,7 mSv, cerca de 5% da dose equivalente da viagem (cerca de 466 mSv).',
  'The dose rate of RAD went up and down with the activity of the Sun, at nearly the same time as the cosmic ray counts on the Earth.':
    'A taxa de dose do RAD subiu e desceu com a atividade do Sol, quase ao mesmo tempo que as contagens de raios cósmicos na Terra.',
  'This flight had no crew. The crew of 4 and the cabin are a reference for the CO2 and O2 forecast only.':
    'Este voo não teve tripulação. Os 4 tripulantes e a cabine são uma referência só para a previsão de CO2 e O2.',
  'The RAD team later lowered its cruise value by about 15%, to 1.58 ± 0.22 mSv for each day (Zeitlin et al. 2019, reported in Guo et al. 2021). The new analysis removes the background of the power source of the rover in a better way, and it uses a new factor to convert the dose in silicon to the dose in water. This preset keeps 1.84, the value of the paper of 2013, because the surface value of 2014 comes from the same method.':
    'Mais tarde, a equipe do RAD baixou seu valor da viagem em cerca de 15%, para 1,58 ± 0,22 mSv por dia (Zeitlin et al. 2019, citado em Guo et al. 2021). A nova análise remove melhor o ruído de fundo da fonte de energia do rover e usa um novo fator para converter a dose no silício em dose na água. Esta missão predefinida mantém 1,84, o valor do artigo de 2013, porque o valor da superfície, de 2014, vem do mesmo método.',
  'The dose line of the cruise is flat, because the distance from the Sun changes the dose very little on this path. Galactic cosmic rays grow by about 4.5% for each AU in this part of the Solar System. The RAD team calls the effect between 1 and 1.5 AU "very small" (Guo et al. 2015). An AU is the mean distance between the Earth and the Sun.':
    'A linha de dose da viagem é plana, porque a distância ao Sol muda muito pouco a dose neste caminho. Os raios cósmicos galácticos aumentam cerca de 4,5% por UA nesta parte do Sistema Solar. A equipe do RAD chama o efeito entre 1 e 1,5 UA de "muito pequeno" (Guo et al. 2015). Uma UA é a distância média entre a Terra e o Sol.',
  'The Sun changes the dose more than the path does. MSL flew in 2011 and 2012, in the rise and the weak maximum of solar cycle 24. An active Sun keeps a part of the galactic cosmic rays out, so the dose is lower at solar maximum. ExoMars TGO flew in 2016, in the declining phase of the same cycle, and it measured a higher dose equivalent: about 2.0 against 1.84 mSv for each day.':
    'O Sol muda a dose mais do que o caminho. A MSL voou em 2011 e 2012, na subida e no máximo fraco do ciclo solar 24. Um Sol ativo mantém fora uma parte dos raios cósmicos galácticos, então a dose é menor no máximo solar. O ExoMars TGO voou em 2016, na fase de declínio do mesmo ciclo, e mediu uma dose equivalente maior: cerca de 2,0 contra 1,84 mSv por dia.',
  'The two instruments had different shielding. RAD was inside the MSL spacecraft, on the rover: about 16 g/cm² as a mean, with large differences between directions. Liulin-MO sits outside the body of the TGO orbiter, on the FREND instrument: from 1 to 100 g/cm², about 20 g/cm² as a mean. A crew cabin will have its own shielding, so its dose will differ from both.':
    'Os dois instrumentos tinham blindagens diferentes. O RAD estava dentro da nave MSL, no rover: cerca de 16 g/cm² em média, com grandes diferenças entre as direções. O Liulin-MO fica fora do corpo do orbitador TGO, no instrumento FREND: de 1 a 100 g/cm², cerca de 20 g/cm² em média. Uma cabine de tripulação terá sua própria blindagem, então sua dose será diferente das duas.',
  'mGy is absorbed dose: the energy that the radiation leaves in a material. mSv is dose equivalent: the absorbed dose times a quality factor for the harm that each kind of particle does to the body. The page shows a mission in one unit. It never adds the two units and it does no conversion of its own.':
    'mGy é dose absorvida: a energia que a radiação deixa em um material. mSv é dose equivalente: a dose absorvida vezes um fator de qualidade para o dano que cada tipo de partícula causa ao corpo. A página mostra uma missão em uma unidade. Ela nunca soma as duas unidades e não faz nenhuma conversão própria.',
  'The NASA career limit is for effective dose, a dose for the whole body. The instruments give dose equivalent at one point behind their own shielding. Both use mSv, but they are not the same quantity. So the day when the mission passes the limit is an estimate.':
    'O limite de carreira da NASA é para a dose efetiva, uma dose para o corpo inteiro. Os instrumentos dão a dose equivalente em um ponto, atrás de sua própria blindagem. As duas usam mSv, mas não são a mesma grandeza. Então o dia em que a missão passa do limite é uma estimativa.',
  'A solar particle event that you add in the simulator is a what-if scenario. It is not a forecast: nobody can predict the day or the size of such an event.':
    'Um evento de partículas solares que você adiciona no simulador é um cenário hipotético. Não é uma previsão: ninguém consegue prever o dia nem o tamanho de um evento desses.',
  'Mars: ExoMars TGO cruise (2016)':
    'Marte: viagem do ExoMars TGO (2016)',
  'The flight of the ExoMars Trace Gas Orbiter of ESA and Roscosmos to Mars, from 14 March to 19 October 2016. The Liulin-MO dosimeter measured the radiation on the way.':
    'O voo do ExoMars Trace Gas Orbiter, da ESA e da Roscosmos, até Marte, de 14 de março a 19 de outubro de 2016. O dosímetro Liulin-MO mediu a radiação no caminho.',
  'The real path of the orbiter from JPL Horizons, from the launch day, 14 March 2016, to the arrival in orbit around Mars on 19 October 2016, with the places of the Earth and Mars.':
    'A trajetória real do orbitador, do JPL Horizons, do dia do lançamento, 14 de março de 2016, à chegada à órbita de Marte em 19 de outubro de 2016, com as posições da Terra e de Marte.',
  'Liulin-MO measured from 22 April to 15 September 2016, with a pause from 19 July to 11 August. The rate is the mean of that time. The instrument saw no solar particle event in the cruise.':
    'O Liulin-MO mediu de 22 de abril a 15 de setembro de 2016, com uma pausa de 19 de julho a 11 de agosto. A taxa é a média desse período. O instrumento não viu nenhum evento de partículas solares na viagem.',
  'Liulin-MO dosimeter of the FREND instrument':
    'Dosímetro Liulin-MO do instrumento FREND',
  'Outside the body of the orbiter, on the FREND instrument. The mass of the spacecraft around the detectors shields them with 1 to 100 g/cm², about 20 g/cm² as a mean (the paper of 2018 gave about 10 g/cm²).':
    'Fora do corpo do orbitador, no instrumento FREND. A massa da nave em volta dos detectores os blinda com 1 a 100 g/cm², cerca de 20 g/cm² em média (o artigo de 2018 dava cerca de 10 g/cm²).',
  'Declining phase of solar cycle 24 (April to September 2016).':
    'Fase de declínio do ciclo solar 24 (abril a setembro de 2016).',
  'The mean dose rate in silicon from galactic cosmic rays in the transit to Mars, from 22 April to 15 September 2016, is 372 ± 37 and 390 ± 39 µGy for each day in two perpendicular directions. The value here is the mean of the two directions. The dose equivalent rate of the same period is about 2 ± 0.3 mSv for each day.':
    'A taxa de dose média no silício, dos raios cósmicos galácticos, no trânsito até Marte, de 22 de abril a 15 de setembro de 2016, é de 372 ± 37 e 390 ± 39 µGy por dia em duas direções perpendiculares. O valor aqui é a média das duas direções. A taxa de dose equivalente do mesmo período é de cerca de 2 ± 0,3 mSv por dia.',
  'The dose equivalent rate from galactic cosmic rays in the transit, from 22 April to 15 September 2016, is about 2 ± 0.3 mSv for each day. The team computes it from the measured dose and a quality factor that depends on the energy that each particle leaves. We could not read the mean quality factor of the cruise in the paper.':
    'A taxa de dose equivalente dos raios cósmicos galácticos no trânsito, de 22 de abril a 15 de setembro de 2016, é de cerca de 2 ± 0,3 mSv por dia. A equipe a calcula a partir da dose medida e de um fator de qualidade que depende da energia que cada partícula deixa. Não conseguimos ler no artigo o fator de qualidade médio da viagem.',
  'ESA: on a flight of six months to Mars and six months back, an astronaut could get at least 60% of the total radiation dose limit that is recommended for a career. ESA does not name the limit in this text. The text is from 2018, before NASA set its limit of 600 mSv.':
    'ESA: em um voo de seis meses até Marte e seis meses de volta, um astronauta poderia receber pelo menos 60% do limite total de dose de radiação recomendado para uma carreira. A ESA não diz qual é o limite neste texto. O texto é de 2018, antes de a NASA definir seu limite de 600 mSv.',
  'In the cruise, the dosimeter measured galactic cosmic rays only. It registered no solar particle event.':
    'Na viagem, o dosímetro mediu só raios cósmicos galácticos. Ele não registrou nenhum evento de partículas solares.',
  'Liulin-MO data, SRTI-BAS':
    'Dados do Liulin-MO, SRTI-BAS',
  'The RAD team compared the two flights: the higher value of TGO comes mainly from the weaker Sun of 2016, and the different shielding of the two spacecraft changed the result little.':
    'A equipe do RAD comparou os dois voos: o valor maior do TGO vem principalmente do Sol mais fraco de 2016, e a blindagem diferente das duas naves mudou pouco o resultado.',
  'In the data file of the team, the dose rate rose by about 3% while the orbiter went from 1.08 to 1.38 AU from the Sun (374 to 386 µGy for each day). This is our reading of the file. A part of the rise comes from the Sun, which became less active in these months.':
    'No arquivo de dados da equipe, a taxa de dose subiu cerca de 3% enquanto o orbitador foi de 1,08 a 1,38 UA do Sol (374 a 386 µGy por dia). Esta é a nossa leitura do arquivo. Uma parte da subida vem do Sol, que ficou menos ativo nesses meses.',
  'Take care with the mGy values of the two instruments. The Liulin-MO value is the dose in silicon, the material of its detectors. The RAD value is converted to dose in water, which is higher: RAD measured 0.332 mGy for each day in silicon and gives 0.481 in water.':
    'Tenha cuidado com os valores em mGy dos dois instrumentos. O valor do Liulin-MO é a dose no silício, o material de seus detectores. O valor do RAD é convertido para dose na água, que é maior: o RAD mediu 0,332 mGy por dia no silício e dá 0,481 na água.',
  'Mars: crewed reference':
    'Marte: referência tripulada',
  'A model of a crewed mission to Mars: a crew of 4 flies the path of MSL, stays on the surface, and flies back. The radiation rates are published means of real instruments.':
    'Um modelo de uma missão tripulada a Marte: 4 tripulantes voam pelo caminho da MSL, ficam na superfície e voltam. As taxas de radiação são médias publicadas de instrumentos reais.',
  'The flight to Mars is the real path of MSL from JPL Horizons (26 November 2011 to 6 August 2012). The stay and the return flight are our model: no spacecraft has flown from Mars back to the Earth.':
    'O voo até Marte é a trajetória real da MSL, do JPL Horizons (26 de novembro de 2011 a 6 de agosto de 2012). A estadia e o voo de volta são um modelo nosso: nenhuma nave voou de Marte de volta à Terra.',
  'The path and the length of the MSL flight. The solar cycle setting selects the instrument: MSL RAD (near solar maximum) or Liulin-MO (declining phase).':
    'O caminho e a duração do voo da MSL. A configuração do ciclo solar escolhe o instrumento: MSL RAD (perto do máximo solar) ou Liulin-MO (fase de declínio).',
  'MSL/Curiosity cruise, 2011 to 2012':
    'Viagem da MSL/Curiosity, 2011 a 2012',
  'Mars surface stay':
    'Estadia na superfície de Marte',
  'The rate that the Curiosity rover measured in Gale crater. You can set the length of the stay. The solar cycle setting does not change this rate.':
    'A taxa que o rover Curiosity mediu na cratera Gale. Você pode definir a duração da estadia. A configuração do ciclo solar não muda esta taxa.',
  'MSL RAD on the Curiosity rover':
    'MSL RAD no rover Curiosity',
  'On the surface of Mars in Gale crater, under the atmosphere: about 21 g/cm² of carbon dioxide above the instrument. The planet blocks the radiation from below.':
    'Na superfície de Marte, na cratera Gale, sob a atmosfera: cerca de 21 g/cm² de dióxido de carbono acima do instrumento. O planeta bloqueia a radiação que vem de baixo.',
  'Near the maximum of solar cycle 24, which was a very weak maximum (August 2012 to June 2013).':
    'Perto do máximo do ciclo solar 24, que foi um máximo muito fraco (agosto de 2012 a junho de 2013).',
  'On the surface, the dose equivalent rate from galactic cosmic rays was 0.64 ± 0.12 mSv for each day. The absorbed dose rate was 0.21 ± 0.04 mGy for each day, and the mean quality factor was about 3.05.':
    'Na superfície, a taxa de dose equivalente dos raios cósmicos galácticos foi de 0,64 ± 0,12 mSv por dia. A taxa de dose absorvida foi de 0,21 ± 0,04 mGy por dia, e o fator de qualidade médio foi de cerca de 3,05.',
  'The absorbed dose rate from galactic cosmic rays at Gale crater was 0.210 ± 0.040 mGy for each day, as dose in tissue.':
    'A taxa de dose absorvida dos raios cósmicos galácticos na cratera Gale foi de 0,210 ± 0,040 mGy por dia, como dose no tecido.',
  'Curiosity rover on Mars, 2012 to 2013':
    'Rover Curiosity em Marte, 2012 a 2013',
  'Return to the Earth':
    'Retorno à Terra',
  'Our model: the return flight has the same length and the same rate as the flight to Mars.':
    'Modelo nosso: o voo de volta tem a mesma duração e a mesma taxa do voo até Marte.',
  'ExoMars TGO cruise, 2016':
    'Viagem do ExoMars TGO, 2016',
  'The RAD team made the first estimate from data for a crewed mission: 360 days of flight give about 660 mSv, and 500 days on the surface give about 320 mSv. Together this is about 1 Sv.':
    'A equipe do RAD fez a primeira estimativa a partir de dados para uma missão tripulada: 360 dias de voo dão cerca de 660 mSv, e 500 dias na superfície dão cerca de 320 mSv. Juntos, isso é cerca de 1 Sv.',
  'NASA plans its next oxygen generator for a deep space mission with a crew of 4 and a length of 3 years. This preset uses the same crew.':
    'A NASA planeja seu próximo gerador de oxigênio para uma missão de espaço profundo com 4 tripulantes e duração de 3 anos. Esta missão predefinida usa a mesma tripulação.',
  'The NASA habitat design for the flight to Mars holds a crew of 4 for up to 1,100 days, with 25 m³ of habitable volume for each person.':
    'O projeto de habitat da NASA para o voo até Marte abriga 4 tripulantes por até 1.100 dias, com 25 m³ de volume habitável por pessoa.',
  'This mission is a model. No crew has flown to Mars. The rates come from instruments on flights with no crew, behind the shielding of those spacecraft.':
    'Esta missão é um modelo. Nenhuma tripulação voou até Marte. As taxas vêm de instrumentos em voos sem tripulação, atrás da blindagem dessas naves.',
  'The stay on the surface and the return flight are our choices. The return flight copies the length and the rate of the flight to Mars.':
    'A estadia na superfície e o voo de volta são escolhas nossas. O voo de volta copia a duração e a taxa do voo até Marte.',
  'The surface rate is from one place and one time: Gale crater, under about 21 g/cm² of atmosphere, near the weak maximum of solar cycle 24. The page has no surface rate for the declining phase, so the solar cycle setting changes the two flights only.':
    'A taxa da superfície é de um lugar e de uma época: a cratera Gale, sob cerca de 21 g/cm² de atmosfera, perto do máximo fraco do ciclo solar 24. A página não tem taxa de superfície para a fase de declínio, então a configuração do ciclo solar muda só os dois voos.',
  'In mGy, the two flight rates are not the same kind of value: the RAD value is the dose in water, and the Liulin-MO value is the dose in silicon. Compare the solar cycle settings in mSv.':
    'Em mGy, as duas taxas de voo não são o mesmo tipo de valor: o valor do RAD é a dose na água, e o valor do Liulin-MO é a dose no silício. Compare as configurações do ciclo solar em mSv.',
  'ISS, 6 months (LEO)':
    'ISS, 6 meses (LEO)',
  'A stay of six months on the International Space Station, in low Earth orbit. The dose rate is the mean of a real NASA record of 30 days in 2017.':
    'Uma estadia de seis meses na Estação Espacial Internacional, em órbita baixa da Terra. A taxa de dose é a média de um registro real da NASA de 30 dias em 2017.',
  'The ground track of the station, computed by this app from the orbit elements of CelesTrak. The elements are from the day of retrieval, not from 2017.':
    'O traçado da estação sobre o solo, calculado por este app a partir dos elementos orbitais do CelesTrak. Os elementos são do dia da consulta, não de 2017.',
  'Low Earth orbit':
    'Órbita baixa da Terra',
  'The record has 30 days. The preset uses its mean for all 180 days.':
    'O registro tem 30 dias. A missão predefinida usa a média dele para todos os 180 dias.',
  'Dosimeters on the station, analysed by the NASA Space Radiation Analysis Group (the source does not name the instruments)':
    'Dosímetros na estação, analisados pelo Space Radiation Analysis Group da NASA (a fonte não diz quais são os instrumentos)',
  'Inside the International Space Station, in low Earth orbit. The magnetic field of the Earth shields the station from a part of the cosmic rays.':
    'Dentro da Estação Espacial Internacional, em órbita baixa da Terra. O campo magnético da Terra protege a estação de uma parte dos raios cósmicos.',
  'Declining phase of solar cycle 24, on the way to solar minimum (August and September 2017).':
    'Fase de declínio do ciclo solar 24, a caminho do mínimo solar (agosto e setembro de 2017).',
  'The record gives the absorbed dose of each day in mGy, as dose in water. The mean of the 30 days from 18 August to 16 September 2017 is 0.32 mGy for each day: 0.14 from galactic cosmic rays and 0.18 from the passes through the South Atlantic Anomaly. The mean is our arithmetic on the daily values of the source.':
    'O registro dá a dose absorvida de cada dia em mGy, como dose na água. A média dos 30 dias de 18 de agosto a 16 de setembro de 2017 é de 0,32 mGy por dia: 0,14 dos raios cósmicos galácticos e 0,18 das passagens pela Anomalia do Atlântico Sul. A média é uma conta nossa sobre os valores diários da fonte.',
  'International Space Station':
    'Estação Espacial Internacional',
  'All of the pressurized volume is air. NASA gives no free air volume. The crew of 6 is the crew of the station in most of the window of the record.':
    'Todo o volume pressurizado é ar. A NASA não dá um volume de ar livre. Os 6 tripulantes são a tripulação da estação na maior parte da janela do registro.',
  'NASA ISS Reference Guide 2015':
    'Guia de Referência da ISS, NASA, 2015',
  'On 11 September 2017 the record shows 0.39 mGy from cosmic rays, about 3 times a normal day. This is the time of the solar particle event that started on 10 September 2017. Two instruments in the Columbus laboratory of the station measured an extra dose of 146.2 and 67.8 µGy in silicon from this event. The link between the record and the event is our reading: the source of the record does not label the day.':
    'Em 11 de setembro de 2017, o registro mostra 0,39 mGy dos raios cósmicos, cerca de 3 vezes um dia normal. Esta é a época do evento de partículas solares que começou em 10 de setembro de 2017. Dois instrumentos no laboratório Columbus da estação mediram uma dose extra de 146,2 e 67,8 µGy no silício por causa desse evento. A ligação entre o registro e o evento é uma leitura nossa: a fonte do registro não identifica o dia.',
  'More than half of the dose of a normal day comes from the passes through the South Atlantic Anomaly, a region over the South Atlantic Ocean where the magnetic field of the Earth is weak: 0.18 of 0.32 mGy.':
    'Mais da metade da dose de um dia normal vem das passagens pela Anomalia do Atlântico Sul, uma região sobre o Oceano Atlântico Sul onde o campo magnético da Terra é fraco: 0,18 de 0,32 mGy.',
  'The crew of the station was 6 persons in the window of the record, and 3 persons from 2 to 13 September 2017.':
    'A tripulação da estação era de 6 pessoas na janela do registro, e de 3 pessoas de 2 a 13 de setembro de 2017.',
  'NASA releases, September 2017':
    'Comunicados da NASA, setembro de 2017',
  'The dose rate is absorbed dose in mGy only. The source gives no dose equivalent in mSv for this record, so the page has no mSv value for this mission and cannot compare it with the career limit.':
    'A taxa de dose é só dose absorvida, em mGy. A fonte não dá a dose equivalente em mSv para este registro, então a página não tem valor em mSv para esta missão e não pode compará-la com o limite de carreira.',
  'The record covers 30 days in 2017, and the preset uses its mean for 180 days. The dose on the station changes with the solar cycle and with the height of the orbit.':
    'O registro cobre 30 dias em 2017, e a missão predefinida usa a média dele para 180 dias. A dose na estação muda com o ciclo solar e com a altura da órbita.',
  'The mean includes one day with a solar particle event (11 September 2017). Without that day the mean is 0.31 mGy for each day.':
    'A média inclui um dia com um evento de partículas solares (11 de setembro de 2017). Sem esse dia, a média é de 0,31 mGy por dia.',
  'The source calls these values a preliminary analysis. The doses are in water, converted by NASA from the dose in silicon.':
    'A fonte chama estes valores de análise preliminar. As doses são na água, convertidas pela NASA a partir da dose no silício.',
  'Custom':
    'Personalizada',
  'Your own mission: set the length of the flight and the dose rate in the simulator.':
    'Sua própria missão: defina a duração do voo e a taxa de dose no simulador.',
  'The app computes the path: a simple transfer orbit from the Earth to Mars for the length that you set. It is not the path of a real flight.':
    'O app calcula o caminho: uma órbita de transferência simples da Terra a Marte para a duração que você define. Não é o caminho de um voo real.',
  'Model of this app':
    'Modelo deste app',
  'Transfer flight':
    'Voo de transferência',
  'The length and the dose rate come from the simulator. The first values are 200 days and 0.':
    'A duração e a taxa de dose vêm do simulador. Os primeiros valores são 200 dias e 0.',
  'none: your own value':
    'nenhum: seu próprio valor',
  'Your own assumption.':
    'Sua própria suposição.',
  'This rate is not a measurement. You set it in the simulator.':
    'Esta taxa não é uma medição. Você a define no simulador.',
  'Your own value':
    'Seu próprio valor',
  'This mission is your own model. The dose rate is the value that you set, and no instrument measured it.':
    'Esta missão é um modelo seu. A taxa de dose é o valor que você define, e nenhum instrumento a mediu.',
  'For a real value to start from: MSL RAD measured 1.84 mSv for each day inside its spacecraft on the way to Mars (2011 to 2012).':
    'Um valor real para começar: o MSL RAD mediu 1,84 mSv por dia dentro de sua nave no caminho até Marte (2011 a 2012).',
  "An individual crewmember's total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv. This limit is universal for all ages and sexes.":
    'A dose efetiva total de radiação de um tripulante ao longo da carreira, devida à exposição à radiação em voos espaciais, deve ser menor que 600 mSv. Este limite é universal para todas as idades e sexos.',
  'effective dose':
    'dose efetiva',
  'The limit is for effective dose: a dose for the whole body, which NASA computes with its own quality factors and a model of the body. The instruments in this app give dose equivalent at one point behind their own shielding. Both use the unit mSv, but they are not the same quantity. So the day when a mission passes the limit is an estimate. The limit counts all flights of a career, not one mission. NASA set it to keep the mean risk of death from cancer caused by the exposure below 3%.':
    'O limite é para a dose efetiva: uma dose para o corpo inteiro, que a NASA calcula com seus próprios fatores de qualidade e um modelo do corpo. Os instrumentos deste app dão a dose equivalente em um ponto, atrás de sua própria blindagem. As duas usam a unidade mSv, mas não são a mesma grandeza. Então o dia em que uma missão passa do limite é uma estimativa. O limite conta todos os voos de uma carreira, não uma só missão. A NASA o definiu para manter abaixo de 3% o risco médio de morte por câncer causado pela exposição.',
}
