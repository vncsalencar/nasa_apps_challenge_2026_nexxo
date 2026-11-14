// Brazilian Portuguese texts. The key is the English template, with the same {names} in the translation.
//
// This file has the texts of the catalog (indicators, roles, scenarios, relations, data source),
// of the notifications about a value, of the mission log, of the personal history, and of the
// error messages of the routes.
//
// Rules that code depends on:
// - A label of an indicator keeps its comma: "CO2 da cabine, média de 7 dias". The web app
//   changes the part after the comma into brackets.
// - "Notified {names}: {title}" must end with ": {title}". The mission log of the web app finds
//   the notifications of a log line by this end.
export const catalog: Record<string, string> = {
  // A number alone. The translation is the same text. The entry stops a "missing" report.
  ...Object.fromEntries(Array.from({ length: 10 }, (_, decimals) => [`{value:${decimals}}`, `{value:${decimals}}`])),

  // Status words.
  Normal: 'Normal',
  Caution: 'Atenção',
  Alert: 'Alerta',

  // Units that are words. The other units (mmHg, °C, bpm, mg/dL, mGy, h, L, min, %) stay as they are.
  'mGy/day': 'mGy/dia',
  'of 5': 'de 5',
  '% of target': '% da meta',

  // Labels of the indicators.
  'Cabin CO2': 'CO2 da cabine',
  'Cabin CO2, 7-day average': 'CO2 da cabine, média de 7 dias',
  'Cabin temperature': 'Temperatura da cabine',
  'Cabin humidity': 'Umidade da cabine',
  'Radiation dose': 'Dose de radiação',
  'Radiation dose, mission total': 'Dose de radiação, total da missão',
  'Heart rate at rest': 'Frequência cardíaca em repouso',
  'Blood pressure, upper': 'Pressão arterial, máxima',
  'Blood pressure, lower': 'Pressão arterial, mínima',
  'Body temperature': 'Temperatura corporal',
  'Blood sugar, before food': 'Glicemia, em jejum',
  'Sleep last night': 'Sono da última noite',
  Mood: 'Humor',
  Stress: 'Estresse',
  Fatigue: 'Fadiga',
  'Water, last day': 'Água, último dia',
  'Food, last day': 'Alimentação, último dia',
  'Exercise, last day': 'Exercício, último dia',

  // Why the crew measures each indicator.
  'CO2 builds up in a closed cabin. On the station, crews report headaches from about 2.8 mmHg.':
    'O CO2 se acumula em uma cabine fechada. Na estação, as tripulações relatam dor de cabeça a partir de cerca de 2,8 mmHg.',
  'One hour of high CO2 is less important than many days of it. The average of 7 days shows the load on the crew.':
    'Uma hora de CO2 alto importa menos do que muitos dias de CO2 alto. A média de 7 dias mostra a carga sobre a tripulação.',
  'Heat and cold change heart rate, sleep and how much water the body loses.':
    'O calor e o frio mudam a frequência cardíaca, o sono e a quantidade de água que o corpo perde.',
  'Dry air irritates eyes and skin. Wet air helps microbes grow.': 'O ar seco irrita os olhos e a pele. O ar úmido ajuda os micróbios a crescer.',
  'Radiation raises the risk of cancer and can cause nausea after a strong solar event.':
    'A radiação aumenta o risco de câncer e pode causar náusea depois de um evento solar forte.',
  'The cancer risk grows with the total dose of the career, not with the dose of one day.':
    'O risco de câncer cresce com a dose total da carreira, não com a dose de um dia.',
  'The heart works differently with no gravity. A fast rate at rest can show stress, fever, low water or high CO2.':
    'O coração trabalha de outro modo sem gravidade. Uma frequência alta em repouso pode indicar estresse, febre, pouca água ou CO2 alto.',
  'Body fluid moves to the head in flight. Blood pressure shows how the heart and the vessels adapt.':
    'Em voo, os líquidos do corpo vão para a cabeça. A pressão arterial mostra como o coração e os vasos se adaptam.',
  'The lower number is the pressure between two heartbeats.': 'O número menor é a pressão entre dois batimentos do coração.',
  'The immune system changes in flight. A fever can be the first sign of an infection.':
    'O sistema imune muda em voo. A febre pode ser o primeiro sinal de uma infecção.',
  'Blood sugar shows if the food intake is right. Some medicines also change it.':
    'A glicemia mostra se a alimentação está certa. Alguns remédios também mudam a glicemia.',
  'Crews on the station sleep about 6 hours, less than planned. Low sleep hurts mood, attention and the immune system.':
    'As tripulações da estação dormem cerca de 6 horas, menos do que o planejado. Pouco sono prejudica o humor, a atenção e o sistema imune.',
  'Isolation and confinement can lower mood. The crew member gives the score, from 1 (very low) to 5 (very good).':
    'O isolamento e o confinamento podem baixar o humor. O tripulante dá a nota, de 1 (muito baixo) a 5 (muito bom).',
  'Stress over many days weakens the immune system and makes sleep worse. The crew member gives the score, from 1 (calm) to 5 (very stressed).':
    'O estresse por muitos dias enfraquece o sistema imune e piora o sono. O tripulante dá a nota, de 1 (calmo) a 5 (muito estressado).',
  'A tired crew member makes more errors. Short sleep and high CO2 cause fatigue. The crew member gives the score, from 1 (fresh) to 5 (exhausted).':
    'Um tripulante cansado erra mais. Pouco sono e CO2 alto causam fadiga. O tripulante dá a nota, de 1 (descansado) a 5 (exausto).',
  'Low water intake raises heart rate, lowers blood pressure, and raises the risk of kidney stones in flight.':
    'Beber pouca água aumenta a frequência cardíaca, baixa a pressão arterial e aumenta o risco de pedras nos rins em voo.',
  'Crews often eat less than they need. Low food intake lowers blood sugar, body mass and mood.':
    'As tripulações muitas vezes comem menos do que precisam. Comer pouco baixa a glicemia, a massa corporal e o humor.',
  'Exercise slows the loss of bone and muscle in weightlessness. Bone density falls 1 to 1.5% each month.':
    'O exercício reduz a perda de osso e de músculo sem gravidade. A densidade dos ossos cai de 1 a 1,5% por mês.',

  // Where the limits come from.
  'Usual clinical range for an adult at rest. Not specific to spaceflight.': 'Faixa clínica habitual para um adulto em repouso. Não é específica para voo espacial.',
  'NASA-STD-3001 Volume 2, chapter 6: the 1-hour average must stay at or below 3 mmHg. NASA OCHMO-TB-004: headaches occur from 2.8 mmHg.':
    'NASA-STD-3001 Volume 2, capítulo 6: a média de 1 hora deve ficar em 3 mmHg ou menos. NASA OCHMO-TB-004: a dor de cabeça ocorre a partir de 2,8 mmHg.',
  'NASA OCHMO-TB-004: a 7-day average below 2.5 mmHg keeps the headache risk under 1%.':
    'NASA OCHMO-TB-004: uma média de 7 dias abaixo de 2,5 mmHg mantém o risco de dor de cabeça abaixo de 1%.',
  'NASA-STD-3001 Volume 2, chapter 6: Crew Performance Environmental Zone 20 to 25 °C, Crew Health Environmental Limits 18 to 27 °C.':
    'NASA-STD-3001 Volume 2, capítulo 6: zona de desempenho da tripulação de 20 a 25 °C, limites de saúde da tripulação de 18 a 27 °C.',
  'NASA-STD-3001 Volume 2, chapter 6: Crew Performance Environmental Zone 30 to 60%, Crew Health Environmental Limits 25 to 75%.':
    'NASA-STD-3001 Volume 2, capítulo 6: zona de desempenho da tripulação de 30 a 60%, limites de saúde da tripulação de 25 a 75%.',
  'Our choice for the prototype, with no NASA limit behind it: the record of this mission stays between 0.27 and 0.31 each day, so 0.5 is clearly above the usual dose. The real NASA limits are 250 mGy-Eq in 30 days for the blood-forming organs and 600 mSv for a career.':
    'Nossa escolha para o protótipo, sem um limite da NASA como base: o registro desta missão fica entre 0,27 e 0,31 por dia, então 0,5 está claramente acima da dose habitual. Os limites reais da NASA são 250 mGy-Eq em 30 dias para os órgãos que formam o sangue e 600 mSv para uma carreira.',
  'Our choice for the prototype: caution at half of the NASA career limit of 600 mSv. The record gives mGy. The same dose in mSv is higher, because mSv also counts the type of particle. So this indicator shows less than the true share of the limit.':
    'Nossa escolha para o protótipo: atenção na metade do limite de carreira da NASA, de 600 mSv. O registro dá mGy. A mesma dose em mSv é maior, porque mSv também conta o tipo de partícula. Por isso, este indicador mostra menos do que a parte real do limite.',
  'Our choice for one night: caution below 6 hours, alert below 5 hours. Adults need 7 hours or more, but crews sleep 6.09 hours on the station (Barger and others, 2014). A check-up starts after 3 short nights.':
    'Nossa escolha para uma noite: atenção abaixo de 6 horas, alerta abaixo de 5 horas. Adultos precisam de 7 horas ou mais, mas as tripulações dormem 6,09 horas na estação (Barger e outros, 2014). Um check-up começa depois de 3 noites curtas.',
  'Our choice for the prototype.': 'Nossa escolha para o protótipo.',
  'Our choice for the prototype. NASA OCHMO-TB-004: fatigue occurs above 4.5 mmHg of CO2.':
    'Nossa escolha para o protótipo. NASA OCHMO-TB-004: a fadiga ocorre acima de 4,5 mmHg de CO2.',
  'NASA-STD-3001 Volume 2, chapter 6: [V2 6110] provides 2.5 litres of water each day for each crew member, for drinks and for food. We use it as the target of the intake. The caution limit of 2.0 litres is our choice.':
    'NASA-STD-3001 Volume 2, capítulo 6: [V2 6110] prevê 2,5 litros de água por dia para cada tripulante, para bebidas e para comida. Usamos esse número como meta de consumo. O limite de atenção de 2,0 litros é nossa escolha.',
  'NASA-STD-3001 Volume 1 [V1 4020]: the crew must get 90% or more of the planned food energy. The alert limit of 70% is our choice.':
    'NASA-STD-3001 Volume 1 [V1 4020]: a tripulação deve receber 90% ou mais da energia planejada dos alimentos. O limite de alerta de 70% é nossa escolha.',
  'NASA: crews on the station exercise about 2 hours each day. Our choice: normal is 90% or more of 120 minutes, alert is below 50%.':
    'NASA: as tripulações da estação fazem cerca de 2 horas de exercício por dia. Nossa escolha: normal é 90% ou mais de 120 minutos, alerta é abaixo de 50%.',

  // Where the values come from.
  'NASA Open Science Data Repository, Environmental Data App, mission RR-6, field "co2_iss" in ppm. We convert to mmHg at a cabin pressure of 760 mmHg, because the NASA limits and the live station telemetry (item USLAB000055) use mmHg.':
    'NASA Open Science Data Repository, Environmental Data App, missão RR-6, campo "co2_iss" em ppm. Convertemos para mmHg com uma pressão de cabine de 760 mmHg, porque os limites da NASA e a telemetria ao vivo da estação (item USLAB000055) usam mmHg.',
  'NASA Open Science Data Repository, Environmental Data App, mission RR-6, field "temperature_iss" in °C. The live station telemetry has the same value as item USLAB000059.':
    'NASA Open Science Data Repository, Environmental Data App, missão RR-6, campo "temperature_iss" em °C. A telemetria ao vivo da estação tem o mesmo valor no item USLAB000059.',
  'NASA Open Science Data Repository, Environmental Data App, mission RR-6, field "rh_iss" in %.':
    'NASA Open Science Data Repository, Environmental Data App, missão RR-6, campo "rh_iss" em %.',
  'NASA Open Science Data Repository, Environmental Data App, mission RR-6, fields "gcr" plus "saa" for each day. The page calls it the dose that the samples received, from a preliminary analysis, and prints no unit. We read the values as mGy.':
    'NASA Open Science Data Repository, Environmental Data App, missão RR-6, campos "gcr" mais "saa" de cada dia. A página chama esse valor de dose que as amostras receberam, de uma análise preliminar, e não mostra a unidade. Lemos os valores como mGy.',
  'Model. NASA does not publish the vitals of crew members.': 'Modelo. A NASA não publica os sinais vitais dos tripulantes.',
  'Basis: Norsk and others, 2015, found no change of the 24-hour heart rate in flight.':
    'Base: Norsk e outros, 2015, não encontraram mudança na frequência cardíaca de 24 horas em voo.',
  'Basis: Norsk and others, 2015, found the 24-hour blood pressure 8 to 10 mmHg lower in flight.':
    'Base: Norsk e outros, 2015, encontraram a pressão arterial de 24 horas de 8 a 10 mmHg mais baixa em voo.',
  'Basis: usual values of a healthy adult.': 'Base: valores habituais de um adulto saudável.',
  'Basis: usual values of a healthy adult before food.': 'Base: valores habituais de um adulto saudável em jejum.',
  'Basis: Barger and others, 2014, measured 6.09 hours of sleep each night on the station.':
    'Base: Barger e outros, 2014, mediram 6,09 horas de sono por noite na estação.',
  'Basis: our choice for the prototype. Short sleep, high stress and low food intake lower it (see relations.ts).':
    'Base: nossa escolha para o protótipo. Pouco sono, estresse alto e pouca comida baixam o valor (veja relations.ts).',
  'Computed each day from the hourly values of "Cabin CO2" in the last 7 days.':
    'Calculado a cada dia com os valores por hora de "CO2 da cabine" nos últimos 7 dias.',
  'Computed each day: the sum of all daily values of "Radiation dose" since the start of the mission.':
    'Calculado a cada dia: a soma de todos os valores diários de "Dose de radiação" desde o início da missão.',
  'Basis: our choice for the prototype. Short sleep raises it.': 'Base: nossa escolha para o protótipo. Pouco sono aumenta o valor.',
  'Basis: our choice for the prototype. Short sleep and very high CO2 raise it.':
    'Base: nossa escolha para o protótipo. Pouco sono e CO2 muito alto aumentam o valor.',
  'Basis: NASA-STD-3001 [V2 6110] provides 2.5 litres of water each day for each crew member, for drinks and for food. We use this number as the target of the intake.':
    'Base: NASA-STD-3001 [V2 6110] prevê 2,5 litros de água por dia para cada tripulante, para bebidas e para comida. Usamos esse número como meta de consumo.',
  'Basis: our choice for the prototype. Very high CO2, heat and low mood lower it.':
    'Base: nossa escolha para o protótipo. CO2 muito alto, calor e humor baixo baixam o valor.',
  'Basis: our choice of a plan of 120 minutes each day. Low mood and fatigue lower it.':
    'Base: nossa escolha de um plano de 120 minutos por dia. Humor baixo e fadiga baixam o valor.',

  // What to do when a value is not normal.
  'Rest, drink water, and measure again in 2 hours.': 'Descanse, beba água e meça de novo em 2 horas.',
  'Get warm and measure again in 30 minutes.': 'Aqueça-se e meça de novo em 30 minutos.',
  'Rest for 10 minutes, drink water, then measure your blood pressure.': 'Descanse por 10 minutos, beba água e depois meça sua pressão arterial.',
  'Sit down, hold a handrail, and measure your blood pressure.': 'Sente-se, segure um corrimão e meça sua pressão arterial.',
  'Rest for 5 minutes and measure again. No hard exercise today.': 'Descanse por 5 minutos e meça de novo. Não faça exercício pesado hoje.',
  'Drink water with salt and eat. Measure again in 1 hour.': 'Beba água com sal e coma. Meça de novo em 1 hora.',
  'Drink water. Measure again tomorrow before food.': 'Beba água. Meça de novo amanhã, em jejum.',
  'Eat or drink something with sugar now. Measure again in 15 minutes.': 'Coma ou beba algo com açúcar agora. Meça de novo em 15 minutos.',
  'Go to sleep earlier tonight. Dim the lights 1 hour before.': 'Vá dormir mais cedo hoje. Reduza as luzes 1 hora antes.',
  'Plan a call with family or friends. Keep your exercise and sleep times.':
    'Marque uma chamada com a família ou com amigos. Mantenha seus horários de exercício e de sono.',
  'Take a 10-minute break now. Tell the commander if the workload is too high.':
    'Faça uma pausa de 10 minutos agora. Avise o comandante se a carga de trabalho estiver alta demais.',
  'Move hard tasks to another day if you can. Sleep earlier tonight.': 'Passe as tarefas difíceis para outro dia, se puder. Durma mais cedo hoje.',
  'Drink water now. The target is 2.5 litres each day.': 'Beba água agora. A meta é 2,5 litros por dia.',
  'Eat your planned meals today.': 'Faça hoje as refeições planejadas.',
  'Do your exercise session today.': 'Faça hoje sua sessão de exercício.',
  'Move to a module with better air flow. The engineers check the CO2 removal system.':
    'Vá para um módulo com melhor circulação de ar. Os engenheiros verificam o sistema de remoção de CO2.',
  'The CO2 was high for days. The engineers check the CO2 removal system.':
    'O CO2 ficou alto por dias. Os engenheiros verificam o sistema de remoção de CO2.',
  'Drink water. Lower the temperature setting of the cabin.': 'Beba água. Baixe o ajuste de temperatura da cabine.',
  'Raise the temperature setting of the cabin.': 'Aumente o ajuste de temperatura da cabine.',
  'Tell the engineers. Wet air helps microbes grow.': 'Avise os engenheiros. O ar úmido ajuda os micróbios a crescer.',
  'Drink water. Dry air irritates eyes and skin.': 'Beba água. O ar seco irrita os olhos e a pele.',
  'Stay in the area with the most shielding until the dose falls.': 'Fique na área com mais blindagem até a dose cair.',
  'Tell the flight surgeons. Plan your time in the shielded area.': 'Avise os médicos de voo. Planeje seu tempo na área blindada.',
  'Measure again later today.': 'Meça de novo mais tarde, ainda hoje.',

  // Roles.
  Commander: 'Comandante',
  'Leads the crew. Gets the alerts of the station cabin.': 'Lidera a tripulação. Recebe os alertas da cabine da estação.',
  'Crew medical officer': 'Oficial médico',
  'The doctor on board. Gets the health notifications of all crew members.':
    'O médico a bordo. Recebe as notificações de saúde de todos os tripulantes.',
  'Flight engineer': 'Engenheiro de voo',
  'Keeps the systems of the station. Gets the notifications of the cabin sensors.':
    'Cuida dos sistemas da estação. Recebe as notificações dos sensores da cabine.',
  'Mission specialist': 'Especialista de missão',
  'Does the science work. Gets only their own notifications.': 'Faz o trabalho de ciência. Recebe só as próprias notificações.',

  // Notifications about a value.
  '{label}: {status}': '{label}: {status}',
  '{name}: {label} is normal': '{name}: {label} está normal',
  '{name}: {label} is caution': '{name}: {label} em atenção',
  '{name}: {label} is alert': '{name}: {label} em alerta',
  'The sensor reads {value}.': 'O sensor mostra {value}.',
  'The value is {value}.': 'O valor é {value}.',
  'Normal: {range}.': 'Normal: {range}.',
  'up to {high} {unit}': 'até {high} {unit}',
  '{low} {unit} or more': '{low} {unit} ou mais',
  '{low} to {high} {unit}': '{low} a {high} {unit}',
  'Check the system and check that the sensor works.': 'Verifique o sistema e verifique se o sensor funciona.',
  '{name} reports: {symptom}': '{name} relata: {symptom}',
  '{names} also reports this symptom.': '{names} também relata este sintoma.',
  '{names} also report this symptom.': '{names} também relatam este sintoma.',
  '{list} and {name}': '{list} e {name}',
  'What to do:': 'O que fazer:',

  // Names of symptoms. The database keeps the English name.
  Headache: 'Dor de cabeça',
  Dizziness: 'Tontura',
  'Blurred vision': 'Visão embaçada',
  'Stuffy nose': 'Nariz entupido',
  'Low mood': 'Humor baixo',
  'Chest pain': 'Dor no peito',
  Palpitations: 'Palpitações',
  Cough: 'Tosse',
  'Short of breath': 'Falta de ar',
  Nausea: 'Náusea',
  'Stomach pain': 'Dor de estômago',
  'No appetite': 'Sem apetite',
  'Back pain': 'Dor nas costas',
  'Muscle pain': 'Dor muscular',
  Numbness: 'Dormência',
  'Skin rash': 'Irritação na pele',
  Weakness: 'Fraqueza',
  'Joint pain': 'Dor nas articulações',
  'Heat stress': 'Estresse por calor',
  Fever: 'Febre',
  'Low blood sugar signs': 'Sinais de glicemia baixa',
  'High blood sugar signs': 'Sinais de glicemia alta',
  'Dehydration signs': 'Sinais de desidratação',

  // Parts of the body in a log line.
  head: 'cabeça',
  chest: 'peito',
  abdomen: 'abdômen',
  arms: 'braços',
  legs: 'pernas',

  // Mission log. The page shows who did the action next to each line.
  'A crew member': 'Um tripulante',
  'the flight surgeons on the ground': 'os médicos de voo em solo',
  'Notified {names}: {title}': 'Avisou {names}: {title}',
  '{label} changed from {before} to {after} ({value}).': '{label} mudou de {before} para {after} ({value}).',
  '{name}: {label} changed from {before} to {after} ({value}).': '{name}: {label} mudou de {before} para {after} ({value}).',
  'Started the mission "{name}" with the NASA record of {record}.': 'Iniciou a missão "{name}" com o registro da NASA de {record}.',
  'Moved the mission clock forward by {count} hour.': 'Avançou o relógio da missão em {count} hora.',
  'Moved the mission clock forward by {count} hours.': 'Avançou o relógio da missão em {count} horas.',
  'Moved the mission clock forward by {hours} hours, to {time}.': 'Avançou o relógio da missão em {hours} h, até {time}.',
  'Started the mission clock.': 'Ligou o relógio da missão.',
  'Stopped the mission clock.': 'Parou o relógio da missão.',
  'Set the simulator changes: {changes}.': 'Definiu as mudanças do simulador: {changes}.',
  'cabin {label} {change}': 'cabine: {label} {change}',
  '{name} {label} {change}': '{name}: {label} {change}',
  'crew {label} {change}': 'tripulação: {label} {change}',
  none: 'nenhuma',
  'Started the scenario "{label}".': 'Iniciou o cenário "{label}".',
  'Added {name} to the crew as {role}.': 'Adicionou {name} à tripulação como {role}.',
  'Changed the role of {name} to {role}.': 'Mudou a função de {name} para {role}.',
  'Entered {label}: {value}.': 'Informou {label}: {value}.',
  '{name} reported the symptom "{symptom}" ({part}).': '{name} relatou o sintoma "{symptom}" ({part}).',
  '{name} reported that the symptom "{symptom}" is gone.': '{name} relatou que o sintoma "{symptom}" passou.',
  '{name} answered "yes" to "{question}"': '{name} respondeu "sim" a "{question}"',
  '{name} answered "no" to "{question}"': '{name} respondeu "não" a "{question}"',
  '{name} said "I am on it" for: {label}.': '{name} disse "Deixa comigo" para: {label}.',
  '{name} finished the work on a problem.': '{name} terminou o trabalho em um problema.',

  // Simulator.
  'Set cabin {label} back to the record.': 'Cabine: {label} voltou ao valor do registro.',
  'Set {name} {label} back to the record.': '{name}: {label} voltou ao valor do registro.',
  'Set cabin {label} to {value} now.': 'Cabine: {label} passou para {value} agora.',
  'Set {name} {label} to {value} now.': '{name}: {label} passou para {value} agora.',
  'TEST: {title}': 'TESTE: {title}',
  'This is a test alert': 'Este é um alerta de teste',
  'The simulator sent this test. No reading is behind it.': 'O simulador enviou este teste. Nenhuma leitura causou este alerta.',
  'TEST: the simulator sent "{title}" to {names}.': 'TESTE: o simulador enviou "{title}" para {names}.',
  'TEST from the simulator. No reading started this question.': 'TESTE do simulador. Nenhuma leitura causou esta pergunta.',
  'TEST: the simulator asked {name}: "{question}"': 'TESTE: o simulador perguntou a {name}: "{question}"',
  'Reset the mission to the end of the NASA record.': 'Voltou a missão para o fim do registro da NASA.',
  'Removed the alerts, questions and symptoms, and all changes of the simulator.':
    'Removeu os alertas, as perguntas e os sintomas, e todas as mudanças do simulador.',

  // Scenarios of the simulator.
  'CO2 builds up': 'O CO2 se acumula',
  'The CO2 removal system fails. Cabin CO2 rises by 1.2 mmHg. The crew then sleeps less, and fatigue and mood get worse the next day.':
    'O sistema de remoção de CO2 falha. O CO2 da cabine sobe 1,2 mmHg. A tripulação então dorme menos, e a fadiga e o humor pioram no dia seguinte.',
  'Solar particle event': 'Evento de partículas solares',
  'The Sun sends a burst of particles. The daily dose rises by 1.5 mGy. The value shows at 12:00.':
    'O Sol lança uma rajada de partículas. A dose diária sobe 1,5 mGy. O valor aparece às 12:00.',
  'Cooling fails': 'O resfriamento falha',
  'The cabin gets 6 °C hotter and more humid. Heart rates and body temperatures rise, and the crew sleeps and eats less.':
    'A cabine fica 6 °C mais quente e mais úmida. As frequências cardíacas e as temperaturas corporais sobem, e a tripulação dorme e come menos.',
  'Bad sleep for all': 'Sono ruim para todos',
  'A shifted schedule. All crew members sleep 1.8 hours less. Stress and fatigue rise and mood falls.':
    'Um horário deslocado. Todos os tripulantes dormem 1,8 hora a menos. O estresse e a fadiga sobem e o humor cai.',
  'One crew member gets sick': 'Um tripulante fica doente',
  'The first crew member gets a fever of about 38.5 °C. The heart rate of this crew member rises with the fever.':
    'O primeiro tripulante tem febre de cerca de 38,5 °C. A frequência cardíaca desse tripulante sobe com a febre.',
  'One crew member eats too little': 'Um tripulante come muito pouco',
  'The second crew member eats 40% less than the target. Blood sugar and mood fall over the next days.':
    'O segundo tripulante come 40% menos do que a meta. A glicemia e o humor caem nos dias seguintes.',
  'One crew member drinks too little': 'Um tripulante bebe muito pouco',
  'The third crew member drinks 1.2 litres less each day. Blood pressure falls and the heart rate rises.':
    'O terceiro tripulante bebe 1,2 litro a menos por dia. A pressão arterial cai e a frequência cardíaca sobe.',

  // Personal history.
  'You entered {label}: {value}': 'Você informou {label}: {value}',
  'You reported: {symptom}': 'Você relatou: {symptom}',
  'Still open.': 'Ainda em aberto.',
  'You reported that this is gone: {symptom}': 'Você relatou que isto passou: {symptom}',
  'Nexxo asked: {question}': 'O Nexxo perguntou: {question}',
  'No answer yet.': 'Ainda sem resposta.',
  'You answered yes: {question}': 'Você respondeu sim: {question}',
  'You answered no: {question}': 'Você respondeu não: {question}',
  'You said "I am on it": {label}': 'Você disse "Deixa comigo": {label}',
  'The work is still open.': 'O trabalho ainda está em aberto.',
  'You finished the work: {label}': 'Você terminou o trabalho: {label}',
  'You said to Nexxo: {text}': 'Você disse ao Nexxo: {text}',
  'You got: {title}': 'Você recebeu: {title}',
  'Not read yet.': 'Ainda não lida.',

  // Relations between indicators: how long the effect takes.
  'hours to days': 'horas a dias',
  hours: 'horas',
  'minutes to hours': 'minutos a horas',
  'same night': 'mesma noite',
  'next day': 'dia seguinte',
  days: 'dias',
  'at once (it is the sum)': 'na hora (é a soma)',
  'the first 2 to 4 days': 'os primeiros 2 a 4 dias',
  months: 'meses',
  weeks: 'semanas',
  'days to weeks': 'dias a semanas',
  'same day': 'mesmo dia',

  // Relations between indicators: what the model of the vitals does.
  'Fatigue rises {value:1} points when the 24-hour mean of CO2 is above 4.5 mmHg.':
    'A fadiga sobe {value:1} ponto quando a média de CO2 de 24 horas fica acima de 4,5 mmHg.',
  'Food intake falls {value}% when the 24-hour mean of CO2 is above 4.5 mmHg.':
    'A alimentação cai {value}% quando a média de CO2 de 24 horas fica acima de 4,5 mmHg.',
  'Heart rate rises {value} bpm for each mmHg of CO2 above 3 mmHg.': 'A frequência cardíaca sobe {value} bpm para cada mmHg de CO2 acima de 3 mmHg.',
  'Sleep falls {value:1} hours for each mmHg of night CO2 above {limit:1} mmHg.':
    'O sono cai {value:1} hora para cada mmHg de CO2 da noite acima de {limit:1} mmHg.',
  'Mood falls {value:1} points for each hour of sleep below 6.1 hours.': 'O humor cai {value:1} ponto para cada hora de sono abaixo de 6,1 horas.',
  'Fatigue rises {value:1} points for each hour of sleep below 6.1 hours.': 'A fadiga sobe {value:1} ponto para cada hora de sono abaixo de 6,1 horas.',
  'Sleep falls {value:2} hours for each °C of night cabin temperature outside 20 to 25 °C.':
    'O sono cai {value:2} hora para cada °C de temperatura da cabine à noite fora de 20 a 25 °C.',
  'Body temperature rises {value:1} °C for each °C of cabin temperature above 27 °C.':
    'A temperatura corporal sobe {value:1} °C para cada °C de temperatura da cabine acima de 27 °C.',
  'Heart rate rises {value} bpm for each °C of cabin temperature above 25 °C.':
    'A frequência cardíaca sobe {value} bpm para cada °C de temperatura da cabine acima de 25 °C.',
  'The server adds all daily doses of the mission.': 'O servidor soma todas as doses diárias da missão.',
  'Heart rate rises {value} bpm for each litre of water below 2.2 litres.':
    'A frequência cardíaca sobe {value} bpm para cada litro de água abaixo de 2,2 litros.',
  'Blood sugar falls {value:1} mg/dL for each % of food intake below 85%.': 'A glicemia cai {value:1} mg/dL para cada % de alimentação abaixo de 85%.',
  'Mood falls {value:2} points for each % of food intake below 80%.': 'O humor cai {value:2} ponto para cada % de alimentação abaixo de 80%.',
  'Exercise falls {value} minutes when mood was 2 or less the day before.':
    'O exercício cai {value} minutos quando o humor foi 2 ou menos no dia anterior.',
  'Stress rises {value:1} points for each hour of sleep below 6 hours.': 'O estresse sobe {value:1} ponto para cada hora de sono abaixo de 6 horas.',
  'Upper blood pressure rises {value} mmHg for each point of stress above 3.':
    'A pressão arterial máxima sobe {value} mmHg para cada ponto de estresse acima de 3.',
  'Heart rate rises {value} bpm for each °C of fever.': 'A frequência cardíaca sobe {value} bpm para cada °C de febre.',
  'Upper blood pressure falls {value} mmHg for each litre of water below 2.2 litres.':
    'A pressão arterial máxima cai {value} mmHg para cada litro de água abaixo de 2,2 litros.',
  'Blood sugar rises {value} mg/dL for each point of stress above 3.': 'A glicemia sobe {value} mg/dL para cada ponto de estresse acima de 3.',
  'Mood falls {value:1} points for each point of stress above 3.': 'O humor cai {value:1} ponto para cada ponto de estresse acima de 3.',
  'Exercise falls {value} minutes for each point of fatigue above 3.': 'O exercício cai {value} minutos para cada ponto de fadiga acima de 3.',

  // The data source.
  'NASA Open Science Data Repository, Environmental Data App': 'NASA Open Science Data Repository, Environmental Data App',
  'Sensors in the cabin of the International Space Station, next to the rodent habitat of this mission.':
    'Sensores na cabine da Estação Espacial Internacional, ao lado do habitat de roedores desta missão.',
  'Temperature (°C), relative humidity (%) and CO2 (ppm): the mean of each hour of the 5-minute record.':
    'Temperatura (°C), umidade relativa (%) e CO2 (ppm): a média de cada hora do registro de 5 minutos.',
  'Radiation (mGy for each day): dose from galactic cosmic rays (gcr) and from the South Atlantic Anomaly (saa).':
    'Radiação (mGy por dia): dose dos raios cósmicos galácticos (gcr) e da Anomalia do Atlântico Sul (saa).',
  'The source gives times with no zone. We read them as UTC.': 'A fonte dá os horários sem fuso. Lemos os horários como UTC.',

  // Error messages of the routes.
  'Send a name for the mission.': 'Envie um nome para a missão.',
  'This mission does not exist.': 'Esta missão não existe.',
  'This scenario does not exist.': 'Este cenário não existe.',
  'Send a name and a role.': 'Envie um nome e uma função.',
  'This role does not exist.': 'Esta função não existe.',
  'Send subject, indicator and value (a number).': 'Envie subject, indicator e value (um número).',
  'Send crewId, bodyPart and name.': 'Envie crewId, bodyPart e name.',
  'This check-up is not open.': 'Este check-up não está aberto.',
  'Send a topic, as a crew member.': 'Envie um topic, como tripulante.',
  'This crew member does not exist.': 'Este tripulante não existe.',
  'Send subject ("env" or "crew:<id>"), an indicator of that subject, and value (a number, or null for the record).':
    'Envie subject ("env" ou "crew:<id>"), um indicator desse subject e value (um número, ou null para o registro).',
  'No crew member matches. Send roles, crewIds, or ground: true.': 'Nenhum tripulante corresponde. Envie roles, crewIds ou ground: true.',
  'Send crewId and ruleId.': 'Envie crewId e ruleId.',
}
