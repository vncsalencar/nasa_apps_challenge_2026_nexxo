// Brazilian Portuguese for the texts of the five lunar presets
// (shared/trip/presets/artemis1.ts, artemis2.ts, lunar-orbit.ts, lunar-surface.ts, gateway.ts).
// The key is the English text of the preset, word for word. A quote from a source stays in English.
export const tripR1: Record<string, string> = {
  // Texts that more than one preset uses.
  'JPL Horizons': 'JPL Horizons',
  'Computed by this app': 'Calculado por este app',
  'Orion crew module': 'Módulo de tripulação da Orion',
  'Van Allen belts': 'Cinturões de Van Allen',
  'Cruise to the Moon': 'Viagem até a Lua',
  Return: 'Retorno',
  'Orion HERA (Hybrid Electronic Radiation Assessor, NASA), three sensors': 'HERA da Orion (Hybrid Electronic Radiation Assessor, NASA), três sensores',
  'Inside the Orion crew module, at three places. The median shielding is 25 g/cm² at the sensor on the cabin wall (HSU2) and 45 g/cm² at the sensor HPU (aluminium equivalent).':
    'Dentro do módulo de tripulação da Orion, em três lugares. A blindagem mediana é de 25 g/cm² no sensor da parede da cabine (HSU2) e de 45 g/cm² no sensor HPU (equivalente em alumínio).',
  'Near the middle of solar cycle 25, between solar minimum and solar maximum (November and December 2022).':
    'Perto do meio do ciclo solar 25, entre o mínimo solar e o máximo solar (novembro e dezembro de 2022).',
  'The paper gives the total absorbed dose from galactic cosmic rays: 10.21 to 10.75 mGy at the same three sensors. We divide it by the 25.29 days after the belts. The rate for each day is our division, not a number of the paper.':
    'O artigo dá a dose absorvida total dos raios cósmicos galácticos: 10,21 a 10,75 mGy nos mesmos três sensores. Nós a dividimos pelos 25,29 dias depois dos cinturões. A taxa por dia é uma divisão nossa, não um número do artigo.',

  // Artemis I
  'Moon: Artemis I (Orion, uncrewed, 2022)': 'Lua: Artemis I (Orion, sem tripulação, 2022)',
  'Artemis I flew the Orion spacecraft with no crew around the Moon and back in 25.5 days, from 16 November to 11 December 2022.':
    'A Artemis I levou a nave Orion, sem tripulação, ao redor da Lua e de volta em 25,5 dias, de 16 de novembro a 11 de dezembro de 2022.',
  'The real flight path of Orion, from the navigation data of NASA Johnson Space Center, as JPL Horizons gives it. The data start about 2 hours after the launch.':
    'A trajetória real da Orion, dos dados de navegação do Centro Espacial Johnson da NASA, como o JPL Horizons a fornece. Os dados começam cerca de 2 horas depois do lançamento.',
  'Artemis I flew no crew. The preset keeps a crew of 4 for the cabin model, because Orion carries 4 astronauts.':
    'A Artemis I voou sem tripulação. A missão predefinida mantém 4 tripulantes para o modelo da cabine, porque a Orion leva 4 astronautas.',
  'Orion has heavy shielding. The paper says that its dose equivalent rates from cosmic rays were "as much as 60% lower" than the earlier measurement of MSL RAD on the way to Mars. Do not compare this rate with MSL RAD without the difference in shielding and in the solar cycle.':
    'A Orion tem blindagem pesada. O artigo diz que as taxas de dose equivalente dos raios cósmicos nela foram "as much as 60% lower" (até 60% menores) que a medição anterior do MSL RAD a caminho de Marte. Não compare esta taxa com o MSL RAD sem considerar a diferença de blindagem e de ciclo solar.',
  'The numbers in the body of the paper give a smaller difference than 60%: 0.96 to 1.24 mSv for each day in Orion against 1.58 for MSL RAD. That is 22% to 39% lower (our arithmetic).':
    'Os números do corpo do artigo dão uma diferença menor que 60%: 0,96 a 1,24 mSv por dia na Orion contra 1,58 do MSL RAD. Isso é 22% a 39% menor (conta nossa).',
  'The paper gives a range for three sensors, not one value. The rates of this preset are the middle of that range.':
    'O artigo dá uma faixa para três sensores, não um valor único. As taxas desta missão predefinida são o meio dessa faixa.',
  'The paper gives a total dose for the Van Allen belts, not a rate. The belt rate for each day is that total divided by the length of the phase (our division).':
    'O artigo dá uma dose total para os cinturões de Van Allen, não uma taxa. A taxa por dia dos cinturões é esse total dividido pela duração da fase (divisão nossa).',
  'The phases count from the launch. The trajectory file starts about 2 hours after the launch.':
    'As fases contam a partir do lançamento. O arquivo da trajetória começa cerca de 2 horas depois do lançamento.',
  'In the inner Van Allen belt, the least shielded places in Orion got about 4 times the dose rate of the most shielded place: 287 and 240 µGy for each minute against 69.':
    'No cinturão interno de Van Allen, os lugares menos blindados da Orion receberam cerca de 4 vezes a taxa de dose do lugar mais blindado: 287 e 240 µGy por minuto contra 69.',
  'Near the end of the inner belt pass, Orion turned by 90 degrees for an engine burn. The dose rate went down by about 50%, because the thick parts of Orion then faced the protons.':
    'Perto do fim da passagem pelo cinturão interno, a Orion girou 90 graus para uma queima do motor. A taxa de dose caiu cerca de 50%, porque as partes espessas da Orion ficaram de frente para os prótons.',
  'At the two close flybys, the Moon blocked about one third of the galactic cosmic rays.': 'Nos dois sobrevoos próximos, a Lua bloqueou cerca de um terço dos raios cósmicos galácticos.',
  'No solar particle event occurred during the mission.': 'Nenhum evento de partículas solares ocorreu durante a missão.',
  'Galactic cosmic rays gave most of the dose. The inner belt gave up to 23% of the total dose at one sensor.':
    'Os raios cósmicos galácticos deram a maior parte da dose. O cinturão interno deu até 23% da dose total em um sensor.',
  'The total of the mission was 26.7 to 35.4 mSv (11.90 to 13.47 mGy) at the three HERA sensors.':
    'O total da missão foi de 26,7 a 35,4 mSv (11,90 a 13,47 mGy) nos três sensores HERA.',
  'From the launch at 06:47 UTC to the end of the outer belt at 10:45 UTC. Orion passed the inner belt (protons) from 07:12 to 07:42 UTC and the outer belt (electrons) from 08:45 to 10:45 UTC.':
    'Do lançamento às 06:47 UTC até o fim do cinturão externo às 10:45 UTC. A Orion passou pelo cinturão interno (prótons) das 07:12 às 07:42 UTC e pelo cinturão externo (elétrons) das 08:45 às 10:45 UTC.',
  'The paper gives the total dose of the belt passes, not a rate: 1.80 to 3.94 mSv in the inner belt and 0.12 to 0.18 mSv in the outer belt, at three places in Orion. The sum is 1.92 to 4.12 mSv. We use the middle, 3.02 mSv, for the whole phase. The rate for each day is this total divided by the length of the phase, which is our division.':
    'O artigo dá a dose total das passagens pelos cinturões, não uma taxa: 1,80 a 3,94 mSv no cinturão interno e 0,12 a 0,18 mSv no cinturão externo, em três lugares da Orion. A soma é 1,92 a 4,12 mSv. Usamos o meio, 3,02 mSv, para a fase inteira. A taxa por dia é esse total dividido pela duração da fase, uma divisão nossa.',
  'The paper gives the total absorbed dose of the belt passes: 1.45 to 3.13 mGy in the inner belt and 0.08 to 0.13 mGy in the outer belt. The sum is 1.53 to 3.26 mGy. We use the middle, 2.395 mGy, for the whole phase. The rate for each day is our division.':
    'O artigo dá a dose absorvida total das passagens pelos cinturões: 1,45 a 3,13 mGy no cinturão interno e 0,08 a 0,13 mGy no cinturão externo. A soma é 1,53 a 3,26 mGy. Usamos o meio, 2,395 mGy, para a fase inteira. A taxa por dia é uma divisão nossa.',
  'Until the outbound flyby on 21 November 2022, 130 km above the Moon. The paper gives one cosmic-ray rate for the whole flight after the belts. It gives no rate for this phase alone.':
    'Até o sobrevoo de ida em 21 de novembro de 2022, a 130 km acima da Lua. O artigo dá uma só taxa de raios cósmicos para todo o voo depois dos cinturões. Ele não dá uma taxa só para esta fase.',
  'The paper gives 0.96 to 1.24 mSv for each day from galactic cosmic rays, at three places in Orion. We use the middle of this range, 1.10. Plus or minus 0.14 covers the range.':
    'O artigo dá 0,96 a 1,24 mSv por dia dos raios cósmicos galácticos, em três lugares da Orion. Usamos o meio dessa faixa, 1,10. Mais ou menos 0,14 cobre a faixa.',
  'Flyby to the distant orbit': 'Do sobrevoo até a órbita distante',
  'From the outbound flyby to the burn into the distant retrograde orbit on 25 November 2022. At the flyby, the Moon blocked about one third of the cosmic rays for a short time. The paper gives one cosmic-ray rate for the whole flight after the belts. It gives no rate for this phase alone.':
    'Do sobrevoo de ida até a queima de entrada na órbita retrógrada distante em 25 de novembro de 2022. No sobrevoo, a Lua bloqueou cerca de um terço dos raios cósmicos por pouco tempo. O artigo dá uma só taxa de raios cósmicos para todo o voo depois dos cinturões. Ele não dá uma taxa só para esta fase.',
  'Distant retrograde orbit': 'Órbita retrógrada distante',
  'Orion flew half of one distant retrograde orbit, about 40,000 miles (64,000 km) above the Moon, from 25 November to 1 December 2022. The paper gives one cosmic-ray rate for the whole flight after the belts. It gives no rate for this phase alone.':
    'A Orion voou metade de uma órbita retrógrada distante, cerca de 40.000 milhas (64.000 km) acima da Lua, de 25 de novembro a 1º de dezembro de 2022. O artigo dá uma só taxa de raios cósmicos para todo o voo depois dos cinturões. Ele não dá uma taxa só para esta fase.',
  'Distant orbit to the return flyby': 'Da órbita distante até o sobrevoo de volta',
  'From the burn out of the orbit to the return flyby on 5 December 2022, 128 km above the Moon. The paper gives one cosmic-ray rate for the whole flight after the belts. It gives no rate for this phase alone.':
    'Da queima de saída da órbita até o sobrevoo de volta em 5 de dezembro de 2022, a 128 km acima da Lua. O artigo dá uma só taxa de raios cósmicos para todo o voo depois dos cinturões. Ele não dá uma taxa só para esta fase.',
  'From the return flyby to the splashdown on 11 December 2022 at 17:40 UTC. The paper gives one cosmic-ray rate for the whole flight after the belts. It gives no rate for this phase alone. NASA switched HERA off shortly before the entry into the atmosphere.':
    'Do sobrevoo de volta até o pouso no mar em 11 de dezembro de 2022 às 17:40 UTC. O artigo dá uma só taxa de raios cósmicos para todo o voo depois dos cinturões. Ele não dá uma taxa só para esta fase. A NASA desligou o HERA pouco antes da entrada na atmosfera.',

  // Artemis II
  'Moon: Artemis II (crewed, 2026)': 'Lua: Artemis II (tripulada, 2026)',
  'Artemis II flew four astronauts in the Orion spacecraft around the Moon and back in 9 days, from 1 to 11 April 2026 (UTC).':
    'A Artemis II levou quatro astronautas na nave Orion ao redor da Lua e de volta em 9 dias, de 1º a 11 de abril de 2026 (UTC).',
  'The real flight path of Orion, from the navigation data of NASA Johnson Space Center, as JPL Horizons gives it. The data start 3 hours 24 minutes after the launch, when Orion left the upper stage.':
    'A trajetória real da Orion, dos dados de navegação do Centro Espacial Johnson da NASA, como o JPL Horizons a fornece. Os dados começam 3 horas e 24 minutos depois do lançamento, quando a Orion se separou do estágio superior.',
  'Artemis I proxy. NASA has not published the measured dose of Artemis II (checked on 15 November 2026). The dose rates of the cruise and of the return are the Artemis I rates.':
    'Substituto da Artemis I. A NASA não publicou a dose medida da Artemis II (verificado em 15 de novembro de 2026). As taxas de dose da viagem de ida e do retorno são as taxas da Artemis I.',
  'The first day has no dose value. Artemis II stayed about 25 hours in a high Earth orbit, on another path through the Van Allen belts than Artemis I. So the total dose of the mission is not complete.':
    'O primeiro dia não tem valor de dose. A Artemis II ficou cerca de 25 horas em uma órbita alta da Terra, em outro caminho pelos cinturões de Van Allen, diferente do da Artemis I. Por isso a dose total da missão não está completa.',
  'Artemis I flew in November and December 2022. Artemis II flew in April 2026. The dose rate from cosmic rays changes with the solar cycle, so the real rate of Artemis II can differ.':
    'A Artemis I voou em novembro e dezembro de 2022. A Artemis II voou em abril de 2026. A taxa de dose dos raios cósmicos muda com o ciclo solar, por isso a taxa real da Artemis II pode ser diferente.',
  'NASA said before the flight that Orion carries six HERA sensors, four M-42 EXT sensors, and one Crew Active Dosimeter for each astronaut. Their results can replace the proxy when NASA publishes them.':
    'A NASA disse antes do voo que a Orion leva seis sensores HERA, quatro sensores M-42 EXT e um Crew Active Dosimeter para cada astronauta. Os resultados deles podem tomar o lugar do substituto quando a NASA os publicar.',
  'The phases count from the launch. The trajectory file starts 3 hours 24 minutes after the launch.':
    'As fases contam a partir do lançamento. O arquivo da trajetória começa 3 horas e 24 minutos depois do lançamento.',
  'High Earth orbit (Van Allen belts)': 'Órbita alta da Terra (cinturões de Van Allen)',
  'From the launch on 1 April 2026 at 22:35 UTC to the burn toward the Moon on 2 April at 23:49 UTC. Orion flew one high orbit around the Earth, with its highest point at about 70,000 km.':
    'Do lançamento em 1º de abril de 2026 às 22:35 UTC até a queima em direção à Lua em 2 de abril às 23:49 UTC. A Orion fez uma órbita alta ao redor da Terra, com o ponto mais alto a cerca de 70.000 km.',
  'No published measurement': 'Nenhuma medição publicada',
  'Inside the Orion crew module': 'Dentro do módulo de tripulação da Orion',
  'April 2026': 'Abril de 2026',
  'No data. NASA has not published the measured dose of Artemis II. Artemis I passed the Van Allen belts one time, in about 4 hours. Artemis II stayed about 25 hours in a high Earth orbit before it left for the Moon, so the Artemis I belt dose does not apply.':
    'Sem dados. A NASA não publicou a dose medida da Artemis II. A Artemis I passou pelos cinturões de Van Allen uma vez, em cerca de 4 horas. A Artemis II ficou cerca de 25 horas em uma órbita alta da Terra antes de partir para a Lua, por isso a dose dos cinturões da Artemis I não se aplica.',
  'From the burn toward the Moon to the closest point of the flyby on 6 April 2026 at 23:00 UTC, 4,067 miles (6,545 km) above the Moon. The first hours of this phase still pass the Van Allen belts, and the proxy rate does not count them.':
    'Da queima em direção à Lua até o ponto mais próximo do sobrevoo em 6 de abril de 2026 às 23:00 UTC, a 4.067 milhas (6.545 km) acima da Lua. As primeiras horas desta fase ainda passam pelos cinturões de Van Allen, e a taxa substituta não as conta.',
  'Proxy from Artemis I, the same spacecraft type with no crew. George et al. 2024 give 0.96 to 1.24 mSv for each day from galactic cosmic rays, at three places in Orion. We use the middle of this range, 1.10.':
    'Substituto da Artemis I, o mesmo tipo de nave, sem tripulação. George et al. 2024 dão 0,96 a 1,24 mSv por dia dos raios cósmicos galácticos, em três lugares da Orion. Usamos o meio dessa faixa, 1,10.',
  'From the flyby to the splashdown in the Pacific Ocean on 11 April 2026 at 00:07 UTC (10 April, 8:07 p.m. EDT).':
    'Do sobrevoo até o pouso no mar, no Oceano Pacífico, em 11 de abril de 2026 às 00:07 UTC (10 de abril, 20:07 no horário EDT).',

  // Lunar orbit
  'Lunar orbit': 'Órbita lunar',
  'A stay of 14 days in a circular orbit 100 km above the Moon, with the dose rate that the robotic orbiter Chandrayaan-1 measured there.':
    'Uma estadia de 14 dias em uma órbita circular a 100 km acima da Lua, com a taxa de dose que o orbitador robótico Chandrayaan-1 mediu ali.',
  'No real flight path. The map puts the spacecraft at the place of the Moon, because an orbit of 100 km is too small for the scale of the map.':
    'Sem trajetória real. O mapa põe a nave no lugar da Lua, porque uma órbita de 100 km é pequena demais para a escala do mapa.',
  'The cabin is our choice: Chandrayaan-1 had no crew. We use the Orion crew module with 4 astronauts, the NASA spacecraft for lunar orbit.':
    'A cabine é uma escolha nossa: a Chandrayaan-1 não tinha tripulação. Usamos o módulo de tripulação da Orion com 4 astronautas, a nave da NASA para a órbita lunar.',
  'The rate is an absorbed dose (mGy). The source gives no dose equivalent (mSv) for this measurement, so the mSv chart shows no data.':
    'A taxa é uma dose absorvida (mGy). A fonte não dá dose equivalente (mSv) para esta medição, por isso o gráfico em mSv não mostra dados.',
  'The rate comes from a robotic orbiter with thin shielding, at a deep solar minimum. A crewed spacecraft with more shielding, at another time of the solar cycle, gets another dose.':
    'A taxa vem de um orbitador robótico com blindagem fina, em um mínimo solar profundo. Uma nave tripulada com mais blindagem, em outro momento do ciclo solar, recebe outra dose.',
  'The length of 14 days, the crew of 4, and the Orion cabin are our choice. NASA says that Orion can keep 4 astronauts for up to 21 days.':
    'A duração de 14 dias, os 4 tripulantes e a cabine da Orion são escolhas nossas. A NASA diz que a Orion pode manter 4 astronautas por até 21 dias.',
  'We could not open the full text of Dachev et al. 2011. The value is from a later paper that cites it. A report of the RADOM team (Vadawale et al. 2010) gives about 10 µGy for each hour at 100 km, which agrees (about 0.24 mGy for each day).':
    'Não conseguimos abrir o texto completo de Dachev et al. 2011. O valor é de um artigo posterior que o cita. Um relatório da equipe do RADOM (Vadawale et al. 2010) dá cerca de 10 µGy por hora a 100 km, o que concorda (cerca de 0,24 mGy por dia).',
  'In the 100 km orbit, the Moon blocks a part of the sky. The dose rate went up from 0.227 to 0.257 mGy for each day when the orbiter moved up to 200 km, because the Moon blocked less and the Sun was less active.':
    'Na órbita de 100 km, a Lua bloqueia uma parte do céu. A taxa de dose subiu de 0,227 para 0,257 mGy por dia quando o orbitador subiu para 200 km, porque a Lua bloqueava menos e o Sol estava menos ativo.',
  'For comparison, as a dose equivalent: George et al. 2024 list 1.55 mSv for each day in low lunar orbit for December 2022, from the CRaTER instrument on the Lunar Reconnaissance Orbiter. That is another instrument and another time, so the app does not use it as the rate.':
    'Para comparação, como dose equivalente: George et al. 2024 listam 1,55 mSv por dia em órbita lunar baixa para dezembro de 2022, do instrumento CRaTER no Lunar Reconnaissance Orbiter. É outro instrumento e outro momento, por isso o app não usa esse valor como taxa.',
  'Lunar orbit, 100 km': 'Órbita lunar, 100 km',
  'The length of 14 days is our choice. In the 200 km orbit of the last three months, the same source gives 0.257 mGy for each day.':
    'A duração de 14 dias é uma escolha nossa. Na órbita de 200 km dos últimos três meses, a mesma fonte dá 0,257 mGy por dia.',
  'Chandrayaan-1 RADOM (Radiation Dose Monitor of the Bulgarian Academy of Sciences, on the ISRO orbiter)':
    'RADOM da Chandrayaan-1 (Radiation Dose Monitor, da Academia de Ciências da Bulgária, no orbitador da ISRO)',
  'On the robotic orbiter, behind about 0.45 g/cm² on the side of the detector that faces space, and more on the other side (De Angelis et al. 2012).':
    'No orbitador robótico, atrás de cerca de 0,45 g/cm² no lado do detector voltado para o espaço, e mais no outro lado (De Angelis et al. 2012).',
  'Deep solar minimum (November 2008 to May 2009), when galactic cosmic rays are strongest.':
    'Mínimo solar profundo (novembro de 2008 a maio de 2009), quando os raios cósmicos galácticos são mais fortes.',
  'RADOM measured "a dose rate of 0.227 mGy per day averaged over 3545 hours" in the 100 km orbit, from 20 November 2008 to 18 May 2009. It is an absorbed dose in a silicon detector. The sentence is from Wimmer-Schweingruber et al. 2020, which cites Dachev et al. 2011.':
    'O RADOM mediu "a dose rate of 0.227 mGy per day averaged over 3545 hours" (uma taxa de dose de 0,227 mGy por dia, na média de 3545 horas) na órbita de 100 km, de 20 de novembro de 2008 a 18 de maio de 2009. É uma dose absorvida em um detector de silício. A frase é de Wimmer-Schweingruber et al. 2020, que cita Dachev et al. 2011.',

  // Lunar surface
  'Lunar surface stay': 'Estadia na superfície lunar',
  'A stay of 30 days on the surface of the Moon, with the dose rate that the Chang’E 4 lander measured there in 2019.':
    'Uma estadia de 30 dias na superfície da Lua, com a taxa de dose que o módulo de pouso Chang’E 4 mediu ali em 2019.',
  'No real flight path. The map puts the crew at the place of the Moon.': 'Sem trajetória real. O mapa põe a tripulação no lugar da Lua.',
  'NASA Surface Habitat (concept)': 'Surface Habitat da NASA (conceito)',
  'The rate comes from the Chang’E 4 lander of CNSA (China National Space Administration). CNSA is not a Space Apps partner agency. The LND instrument is German: a team at Kiel University designed it, with support of the German Space Agency at DLR.':
    'A taxa vem do módulo de pouso Chang’E 4 da CNSA (Administração Espacial Nacional da China). A CNSA não é uma agência parceira do Space Apps. O instrumento LND é alemão: uma equipe da Universidade de Kiel o projetou, com apoio da Agência Espacial Alemã no DLR.',
  'The instrument sat behind thin shielding (about 1 g/cm²), like a space suit or a rover. The paper says the value is a good estimate for work outside in a space suit. A habitat with more shielding gets a lower dose.':
    'O instrumento ficou atrás de uma blindagem fina (cerca de 1 g/cm²), como a de um traje espacial ou de um rover. O artigo diz que o valor é uma boa estimativa para o trabalho do lado de fora, com traje espacial. Um habitat com mais blindagem recebe uma dose menor.',
  'The rate is from a time near solar minimum. The paper says it is an upper limit of the dose from galactic cosmic rays at low solar activity.':
    'A taxa é de uma época perto do mínimo solar. O artigo diz que ela é um limite superior da dose dos raios cósmicos galácticos em baixa atividade solar.',
  'The dose equivalent (mSv) counts charged particles only. The absorbed dose (mGy) also counts neutral particles.':
    'A dose equivalente (mSv) conta só as partículas carregadas. A dose absorvida (mGy) conta também as partículas neutras.',
  'The stay of 30 days and the crew of 2 are our choice. They follow the NASA Surface Habitat concept: 2 astronauts for about 30 days, in about 127 m³.':
    'A estadia de 30 dias e os 2 tripulantes são escolhas nossas. Elas seguem o conceito Surface Habitat da NASA: 2 astronautas por cerca de 30 dias, em cerca de 127 m³.',
  'The dose equivalent on the Moon was about 2.6 times the dose equivalent inside the International Space Station in the same days (1369 against 523 µSv for each day from galactic cosmic rays).':
    'A dose equivalente na Lua foi cerca de 2,6 vezes a dose equivalente dentro da Estação Espacial Internacional nos mesmos dias (1369 contra 523 µSv por dia dos raios cósmicos galácticos).',
  'Neutral particles (neutrons and gamma rays from the lunar soil) gave 23 ± 8% of the absorbed dose.':
    'As partículas neutras (nêutrons e raios gama do solo lunar) deram 23 ± 8% da dose absorvida.',
  'No solar particle event occurred during the measurement.': 'Nenhum evento de partículas solares ocorreu durante a medição.',
  'For another time of the solar cycle: George et al. 2024 list 0.81 mSv for each day on the lunar surface for December 2022, with Zhang et al. 2020 as the source.':
    'Para outro momento do ciclo solar: George et al. 2024 listam 0,81 mSv por dia na superfície lunar para dezembro de 2022, com Zhang et al. 2020 como fonte.',
  'Lunar surface': 'Superfície lunar',
  'LND measured in the Von Kármán crater on the far side of the Moon, from 3 to 12 January and from 31 January to 10 February 2019.':
    'O LND mediu na cratera Von Kármán, no lado oculto da Lua, de 3 a 12 de janeiro e de 31 de janeiro a 10 de fevereiro de 2019.',
  'Chang’E 4 LND (Lunar Lander Neutrons and Dosimetry, Kiel University, on the CNSA lander)':
    'LND da Chang’E 4 (Lunar Lander Neutrons and Dosimetry, Universidade de Kiel, no módulo de pouso da CNSA)',
  'Inside the payload compartment of the lander, behind about 1 g/cm² (about 3.5 mm of aluminium). The paper compares this with a space suit or a rover, not with a habitat.':
    'Dentro do compartimento de carga do módulo de pouso, atrás de cerca de 1 g/cm² (cerca de 3,5 mm de alumínio). O artigo compara isso com um traje espacial ou um rover, não com um habitat.',
  'Near solar minimum (January and February 2019), when galactic cosmic rays are strongest.':
    'Perto do mínimo solar (janeiro e fevereiro de 2019), quando os raios cósmicos galácticos são mais fortes.',
  'LND measured "an average dose equivalent of 1369 μSv/day on the surface of the Moon", which is 57.1 ± 10.6 µSv for each hour. This value counts charged particles only.':
    'O LND mediu "an average dose equivalent of 1369 μSv/day on the surface of the Moon" (uma dose equivalente média de 1369 μSv por dia na superfície da Lua), o que é 57,1 ± 10,6 µSv por hora. Este valor conta só as partículas carregadas.',
  'The paper gives "an average total absorbed dose rate in silicon of 13.2 ± 1 μGy/hour", which is 0.317 mGy for each day. This value also counts neutral particles (3.1 ± 0.5 µGy for each hour).':
    'O artigo dá "an average total absorbed dose rate in silicon of 13.2 ± 1 μGy/hour" (uma taxa média de dose absorvida total no silício de 13,2 ± 1 μGy por hora), o que é 0,317 mGy por dia. Este valor conta também as partículas neutras (3,1 ± 0,5 µGy por hora).',

  // Gateway
  'Lunar Gateway (planned station)': 'Gateway lunar (estação planejada)',
  'Gateway is a small station that NASA and its partners planned for a near-rectilinear halo orbit around the Moon. This preset is a stay of 30 days on it.':
    'O Gateway é uma pequena estação que a NASA e seus parceiros planejaram para uma órbita halo quase retilínea ao redor da Lua. Esta missão predefinida é uma estadia de 30 dias nele.',
  'No real flight path. The map puts the station at the place of the Moon. The planned orbit takes about 6.5 days, between about 1,500 km and about 70,000 km from the Moon.':
    'Sem trajetória real. O mapa põe a estação no lugar da Lua. A órbita planejada leva cerca de 6,5 dias, entre cerca de 1.500 km e cerca de 70.000 km da Lua.',
  'Gateway, fully assembled': 'Gateway, totalmente montado',
  'Gateway has no flown station data. Every Gateway number is a proxy.': 'O Gateway não tem dados de uma estação que voou. Todo número do Gateway é um substituto.',
  'Artemis I proxy. The dose rate is the rate that Artemis I measured inside Orion after the Van Allen belts. The shielding of Gateway is not the shielding of Orion, so the real rate can differ.':
    'Substituto da Artemis I. A taxa de dose é a taxa que a Artemis I mediu dentro da Orion depois dos cinturões de Van Allen. A blindagem do Gateway não é a blindagem da Orion, por isso a taxa real pode ser diferente.',
  'NASA said on 24 March 2026 that it intends to pause Gateway in its current form.': 'A NASA disse em 24 de março de 2026 que pretende pausar o Gateway na forma atual.',
  'The stay of 30 days is our choice. NASA planned stays of 30 to 90 days for up to four astronauts, with Orion attached.':
    'A estadia de 30 dias é uma escolha nossa. A NASA planejou estadias de 30 a 90 dias para até quatro astronautas, com a Orion acoplada.',
  'The habitable volume of about 125 m³ is the NASA number for the fully assembled station. An early station has fewer modules, so it has less volume.':
    'O volume habitável de cerca de 125 m³ é o número da NASA para a estação totalmente montada. Uma estação inicial tem menos módulos, por isso tem menos volume.',
  'Artemis I flew in November and December 2022. The dose rate from cosmic rays changes with the solar cycle.':
    'A Artemis I voou em novembro e dezembro de 2022. A taxa de dose dos raios cósmicos muda com o ciclo solar.',
  'Gateway orbit': 'Órbita do Gateway',
  'A near-rectilinear halo orbit: a long orbit over the poles of the Moon. The length of 30 days is our choice.':
    'Uma órbita halo quase retilínea: uma órbita alongada sobre os polos da Lua. A duração de 30 dias é uma escolha nossa.',
  'Proxy from Artemis I: no station has flown in this orbit. George et al. 2024 give 0.96 to 1.24 mSv for each day from galactic cosmic rays inside Orion, far from the Earth. We use the middle of this range, 1.10.':
    'Substituto da Artemis I: nenhuma estação voou nesta órbita. George et al. 2024 dão 0,96 a 1,24 mSv por dia dos raios cósmicos galácticos dentro da Orion, longe da Terra. Usamos o meio dessa faixa, 1,10.',
}
