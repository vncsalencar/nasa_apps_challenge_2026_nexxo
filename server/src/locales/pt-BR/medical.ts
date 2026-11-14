// Brazilian Portuguese texts. The key is the English template, with the same {names} in the translation.
// This file holds the texts of rules.ts, causes.ts and crew.ts, and the names of the symptoms.
//
// Words that this file uses in one way only:
// - "habitual" for the personal usual value. "Normal" is only the status of a value.
// - "pressão arterial máxima" for the upper (systolic) blood pressure.
// - "sem gravidade" for weightlessness, and "em jejum" for a blood sugar value before food, the same as catalog.ts.
// - "equipe em solo" for the ground team, "médicos de voo" for the flight surgeons.
// - "relatar" for a crew member who reports a symptom.
// A decimal number in a fixed text has a comma: "2,8 mmHg".
export const medical: Record<string, string> = {
  // ---- The names of the symptoms. The data keeps the English name. ----
  Headache: 'Dor de cabeça',
  Dizziness: 'Tontura',
  'Blurred vision': 'Visão embaçada',
  Fatigue: 'Fadiga',
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
  'Skin rash': 'Erupção na pele',
  Weakness: 'Fraqueza',
  'Joint pain': 'Dor nas articulações',
  'Heat stress': 'Estresse por calor',
  Fever: 'Febre',
  'Low blood sugar signs': 'Sinais de glicemia baixa',
  'High blood sugar signs': 'Sinais de glicemia alta',
  'Dehydration signs': 'Sinais de desidratação',
  Stress: 'Estresse',

  // ---- rules.ts: the titles of the check-ups ----
  'High CO2 in the cabin': 'CO2 alto na cabine',
  'Very high CO2 in the cabin': 'CO2 muito alto na cabine',
  'High radiation dose': 'Dose de radiação alta',
  'Hot cabin': 'Cabine quente',
  'Fast heart rate at rest': 'Frequência cardíaca alta em repouso',
  'Slow heart rate': 'Frequência cardíaca baixa',
  'High blood pressure': 'Pressão arterial alta',
  'Low blood pressure': 'Pressão arterial baixa',
  'Low blood sugar': 'Glicemia baixa',
  'High blood sugar': 'Glicemia alta',
  'Not enough sleep': 'Sono insuficiente',
  'CO2 high for many days': 'CO2 alto por muitos dias',
  'Low food intake': 'Baixo consumo de alimentos',
  'Low water intake': 'Baixo consumo de água',
  'Missed exercise': 'Exercício não feito',
  'High stress for 3 days': 'Estresse alto por 3 dias',
  'High fatigue': 'Fadiga alta',

  // ---- rules.ts: the questions ----
  'Do you have a headache?': 'Você está com dor de cabeça?',
  'Do you feel very tired or sick in the stomach?': 'Você sente muito cansaço ou enjoo?',
  'Do you feel nausea or unusual tiredness?': 'Você sente náusea ou um cansaço fora do comum?',
  'Do you feel hot, thirsty or dizzy?': 'Você sente calor, sede ou tontura?',
  'Do you feel chest pain or a pounding heart?': 'Você sente dor no peito ou o coração batendo forte?',
  'Do you feel dizzy or faint?': 'Você sente tontura ou sensação de desmaio?',
  'Do you have chills, a sore throat or a cough?': 'Você está com calafrios, dor de garganta ou tosse?',
  'Do you have a headache or blurred vision?': 'Você está com dor de cabeça ou visão embaçada?',
  'Do you feel dizzy or weak?': 'Você sente tontura ou fraqueza?',
  'Do you feel shaky, sweaty or confused?': 'Você sente tremores, suor ou confusão?',
  'Are you very thirsty, or do you urinate more than usual?': 'Você está com muita sede, ou urina mais do que o habitual?',
  'Do you feel too tired to work safely?': 'Você sente cansaço demais para trabalhar com segurança?',
  'Do you want to talk with the crew medical officer or the ground team?': 'Você quer conversar com o oficial médico ou com a equipe em solo?',
  'Did you wake with a headache in the last days?': 'Você acordou com dor de cabeça nos últimos dias?',
  'Is your appetite low, or does food taste different?': 'Você está com pouco apetite, ou a comida está com gosto diferente?',
  'Is your urine dark, or do you have pain in the side of your lower back?': 'Sua urina está escura, ou você sente dor na lateral da parte de baixo das costas?',
  'Did pain or weakness stop your exercise?': 'Dor ou fraqueza impediu o seu exercício?',

  // ---- rules.ts: what the crew member can do ----
  'Move to a module with better air flow. Tell the crew to check the CO2 removal system.':
    'Vá para um módulo com melhor circulação de ar. Diga à tripulação para verificar o sistema de remoção de CO2.',
  'Leave this module now. The crew must repair the CO2 removal system and tell the ground team.':
    'Saia deste módulo agora. A tripulação deve consertar o sistema de remoção de CO2 e avisar a equipe em solo.',
  'Stay in the area of the cabin with the most shielding until the dose falls.': 'Fique na área da cabine com mais blindagem até a dose cair.',
  'Drink water and lower the temperature setting of the cabin.': 'Beba água e baixe o ajuste de temperatura da cabine.',
  'Rest for 10 minutes, drink water, then measure your blood pressure.': 'Descanse por 10 minutos, beba água e depois meça sua pressão arterial.',
  'Sit down and hold on to a handrail. Measure your blood pressure.': 'Sente-se e segure em um corrimão. Meça sua pressão arterial.',
  'Rest, drink water, and measure your temperature again in 2 hours. Keep distance from the crew.':
    'Descanse, beba água e meça sua temperatura de novo em 2 horas. Mantenha distância da tripulação.',
  'Rest for 5 minutes and measure again. Do not do hard exercise today.': 'Descanse por 5 minutos e meça de novo. Não faça exercício pesado hoje.',
  'Drink water with salt and eat. Measure again in 1 hour.': 'Beba água com sal e coma. Meça de novo em 1 hora.',
  'Eat or drink something with sugar now. Measure again in 15 minutes.': 'Coma ou beba algo com açúcar agora. Meça de novo em 15 minutos.',
  'Drink water. Measure again tomorrow before food. Check your food log and your medicines.':
    'Beba água. Meça de novo amanhã, em jejum. Confira seu registro de alimentação e seus remédios.',
  'Ask the commander to move hard tasks. Avoid caffeine 6 hours before sleep and dim the lights early.':
    'Peça ao comandante para mudar o horário das tarefas difíceis. Evite cafeína nas 6 horas antes de dormir e diminua as luzes cedo.',
  'Plan a call with family or friends, and keep your exercise and sleep times.':
    'Marque uma chamada com a família ou com amigos, e mantenha seus horários de exercício e de sono.',
  'Check the air flow in your sleep area. Sleep in another place for one night and compare.':
    'Verifique a circulação de ar na sua área de dormir. Durma em outro lugar por uma noite e compare.',
  'Eat the planned menu and add an energy drink from the stock. Measure your blood sugar before food tomorrow.':
    'Coma o cardápio planejado e acrescente uma bebida energética do estoque. Meça sua glicemia amanhã, em jejum.',
  'Drink 0.5 litres now, and 2.5 litres or more each day. Low water raises the risk of kidney stones in flight.':
    'Beba 0,5 litro agora, e 2,5 litros ou mais por dia. Beber pouca água aumenta o risco de pedras nos rins em voo.',
  'Plan the next session at a time with less work. Tell the crew medical officer if pain is the reason.':
    'Marque a próxima sessão para um horário com menos trabalho. Se o motivo for dor, avise o oficial médico.',
  'Take the planned free time, plan a contact with family, and do your exercise session.':
    'Tire o tempo livre planejado, marque um contato com a família e faça sua sessão de exercício.',
  'Ask the commander to move hard tasks. Sleep the full period tonight.':
    'Peça ao comandante para mudar o horário das tarefas difíceis. Durma o período completo esta noite.',

  // ---- rules.ts: the reason of a check-up ----
  'Cabin CO2 was {value:2} mmHg on average in the last 3 hours. Crews report headaches from 2.8 mmHg.':
    'O CO2 da cabine ficou em {value:2} mmHg em média nas últimas 3 horas. Tripulações relatam dor de cabeça a partir de 2,8 mmHg.',
  'Cabin CO2 was {value:2} mmHg on average in the last 3 hours. Fatigue and nausea occur above 4.5 mmHg.':
    'O CO2 da cabine ficou em {value:2} mmHg em média nas últimas 3 horas. Fadiga e náusea ocorrem acima de 4,5 mmHg.',
  'The radiation dose was {value:2} mGy in the last day. The NASA record of this mission stays near 0.3 mGy each day.':
    'A dose de radiação foi de {value:2} mGy no último dia. O registro da NASA desta missão fica perto de 0,3 mGy por dia.',
  'The cabin was above 27 °C for 3 hours. The health zone of NASA ends at 27 °C.':
    'A cabine ficou acima de 27 °C durante 3 horas. A faixa saudável da NASA termina em 27 °C.',
  'Your heart rate at rest was above 100 bpm for 3 hours (now {value:0} bpm).':
    'Sua frequência cardíaca em repouso ficou acima de 100 bpm durante 3 horas (agora {value:0} bpm).',
  'Your heart rate was below 50 bpm for 3 hours (now {value:0} bpm).':
    'Sua frequência cardíaca ficou abaixo de 50 bpm durante 3 horas (agora {value:0} bpm).',
  'Your body temperature is {value:1} °C.': 'Sua temperatura corporal é de {value:1} °C.',
  'That is {difference:1} °C above your usual value.': 'Isso é {difference:1} °C acima do seu valor habitual.',
  'The immune system is weaker in flight, so a fever needs attention.': 'O sistema imune fica mais fraco em voo, por isso uma febre precisa de atenção.',
  'Your upper blood pressure is {value:0} mmHg. Fluid moves to the head in flight and can also change vision.':
    'Sua pressão arterial máxima é de {value:0} mmHg. Em voo, os líquidos do corpo vão para a cabeça e também podem mudar a visão.',
  'Your upper blood pressure is {value:0} mmHg. Low water or low food intake can cause this.':
    'Sua pressão arterial máxima é de {value:0} mmHg. Beber pouca água ou comer pouco pode causar isso.',
  'Your blood sugar is {value:0} mg/dL. A missed meal or a medicine can cause this.':
    'Sua glicemia é de {value:0} mg/dL. Uma refeição pulada ou um remédio pode causar isso.',
  'Your blood sugar before food is {value:0} mg/dL. The usual limit is 100.': 'Sua glicemia em jejum é de {value:0} mg/dL. O limite habitual é 100.',
  'You slept less than 5.5 hours for 3 nights ({value:1} hours on average).':
    'Você dormiu menos de 5,5 horas por noite durante 3 noites ({value:1} horas em média).',
  'You gave your mood a score of 2 or less for 2 days.': 'Você deu nota 2 ou menos para o seu humor durante 2 dias.',
  'The 7-day average of cabin CO2 is {value:2} mmHg, and you slept less than 6 hours for 2 nights. The NASA target for this average is 2.5 mmHg or less.':
    'A média de 7 dias do CO2 da cabine é de {value:2} mmHg, e você dormiu menos de 6 horas por noite durante 2 noites. A meta da NASA para essa média é de 2,5 mmHg ou menos.',
  'You ate less than 70% of your target for 3 days ({value:0}% on average). Low food intake lowers blood sugar, strength and mood.':
    'Você comeu menos de 70% da sua meta durante 3 dias ({value:0}% em média). Comer pouco baixa a glicemia, a força e o humor.',
  'You drank less than 2 litres for 2 days ({value:1} litres on average). The minimum is 2.5 litres.':
    'Você bebeu menos de 2 litros por dia durante 2 dias ({value:1} L em média). O mínimo é 2,5 litros.',
  'You did less than 60 minutes of exercise for 3 days ({value:0} minutes on average). The plan is 120 minutes. Bone and muscle loss is fast in weightlessness.':
    'Você fez menos de 60 minutos de exercício por dia durante 3 dias ({value:0} minutos em média). O plano é de 120 minutos. A perda de osso e de músculo é rápida sem gravidade.',
  'You gave your stress a score of 4 or more for 3 days. Stress over days makes sleep worse and weakens the immune system.':
    'Você deu nota 4 ou mais para o seu estresse durante 3 dias. O estresse por vários dias piora o sono e enfraquece o sistema imune.',
  'You gave your fatigue a score of 4 or more for 2 days.': 'Você deu nota 4 ou mais para a sua fadiga durante 2 dias.',

  // ---- rules.ts: the line in the mission log ----
  'Asked {name}: "{question}" Reason: {title}.': 'Pergunta feita a {name}: "{question}" Motivo: {title}.',

  // ---- causes.ts: the titles of the cause checks ----
  'Very high cabin CO2': 'CO2 da cabine muito alto',
  'High cabin CO2': 'CO2 da cabine alto',
  'Cabin CO2 high for many days': 'CO2 da cabine alto por muitos dias',
  'Cabin too warm or too cold for sleep': 'Cabine quente ou fria demais para dormir',
  'Dry cabin air': 'Ar seco na cabine',
  'Short sleep': 'Sono curto',
  'Raised body temperature': 'Temperatura corporal elevada',
  'High stress': 'Estresse alto',
  'Little exercise': 'Pouco exercício',
  'Long time in weightlessness': 'Muito tempo sem gravidade',
  'First days in weightlessness': 'Primeiros dias sem gravidade',
  'Body fluid moves to the head': 'Os líquidos do corpo vão para a cabeça',
  'No load on the spine': 'Coluna sem carga',

  // ---- causes.ts: what to do about a cause ----
  'Leave this module. The crew must repair the CO2 removal system and tell the ground team.':
    'Saia deste módulo. A tripulação deve consertar o sistema de remoção de CO2 e avisar a equipe em solo.',
  'Move to a module with better air flow. Ask the engineer to check the CO2 removal system.':
    'Vá para um módulo com melhor circulação de ar. Peça ao engenheiro de voo para verificar o sistema de remoção de CO2.',
  'Ask the engineer to check the CO2 removal system and the air flow in the sleep area.':
    'Peça ao engenheiro de voo para verificar o sistema de remoção de CO2 e a circulação de ar na área de dormir.',
  'Drink water, rest, and lower the temperature setting of the cabin.': 'Beba água, descanse e baixe o ajuste de temperatura da cabine.',
  'Change the temperature setting of the sleep area.': 'Mude o ajuste de temperatura da área de dormir.',
  'Use eye drops and skin cream as planned, and drink enough.': 'Use colírio e creme para a pele conforme o planejado, e beba líquido suficiente.',
  'Stay in the area with the most shielding. Report nausea, fatigue and skin changes for the next 24 hours.':
    'Fique na área com mais blindagem. Relate náusea, fadiga e mudanças na pele durante as próximas 24 horas.',
  'Protect the next sleep period: dim the lights early, and ask the commander to move hard tasks.':
    'Proteja o próximo período de sono: diminua as luzes cedo e peça ao comandante para mudar o horário das tarefas difíceis.',
  'Drink 0.5 litres now. Drink 2.5 litres or more each day.': 'Beba 0,5 litro agora. Beba 2,5 litros ou mais por dia.',
  'Eat the planned menu. Tell the crew medical officer if your appetite is low or food tastes different.':
    'Coma o cardápio planejado. Se você estiver com pouco apetite ou a comida estiver com gosto diferente, avise o oficial médico.',
  'Measure again tomorrow before food. Check your food log and your medicines.':
    'Meça de novo amanhã, em jejum. Confira seu registro de alimentação e seus remédios.',
  'Rest, drink, and measure again in 2 hours. Keep distance from the crew and tell the crew medical officer.':
    'Descanse, beba líquido e meça de novo em 2 horas. Mantenha distância da tripulação e avise o oficial médico.',
  'Rest for 5 minutes and measure again.': 'Descanse por 5 minutos e meça de novo.',
  'Rest for 10 minutes and drink water. Then measure your blood pressure.': 'Descanse por 10 minutos e beba água. Depois meça sua pressão arterial.',
  'Take the planned free time. Talk with the crew medical officer if the stress stays.':
    'Tire o tempo livre planejado. Se o estresse continuar, converse com o oficial médico.',
  'Plan a call with family or friends. Keep your exercise and sleep times.':
    'Marque uma chamada com a família ou com amigos. Mantenha seus horários de exercício e de sono.',
  'Plan the next exercise session at a time with less work.': 'Marque a próxima sessão de exercício para um horário com menos trabalho.',
  'Do the near vision check for each eye. The crew medical officer plans an eye scan, and the ground team reads the images.':
    'Faça o teste de visão de perto em cada olho. O oficial médico planeja um exame de imagem dos olhos, e a equipe em solo analisa as imagens.',
  'Move your head slowly. Eat and drink small amounts often.': 'Mova a cabeça devagar. Coma e beba pequenas quantidades várias vezes.',
  'Report this symptom again if it stays or gets worse.': 'Se este sintoma continuar ou piorar, relate o sintoma de novo.',
  'Stretch in a curled position and keep the exercise plan.': 'Alongue-se em posição encolhida e mantenha o plano de exercícios.',

  // ---- causes.ts: the evidence of a cause ----
  'Cabin CO2 was {mean:2} mmHg on average in the last 3 hours, and {high:2} mmHg at the highest in the last 24 hours. Crews report headaches from 2.8 mmHg.':
    'O CO2 da cabine ficou em {mean:2} mmHg em média nas últimas 3 horas, e chegou a {high:2} mmHg no ponto mais alto das últimas 24 horas. Tripulações relatam dor de cabeça a partir de 2,8 mmHg.',
  'The 7-day average of cabin CO2 is {value:2} mmHg. The NASA target is 2.5 mmHg or less, because then the headache risk is under 1%.':
    'A média de 7 dias do CO2 da cabine é de {value:2} mmHg. A meta da NASA é de 2,5 mmHg ou menos, porque assim o risco de dor de cabeça fica abaixo de 1%.',
  'The cabin was {value:1} °C on average in the last 3 hours. The health zone of NASA ends at 27 °C. Heat raises heart rate and body temperature.':
    'A cabine ficou em {value:1} °C em média nas últimas 3 horas. A faixa saudável da NASA termina em 27 °C. O calor aumenta a frequência cardíaca e a temperatura corporal.',
  'The cabin was {value:1} °C on average in the last 24 hours. The comfort zone is 20 to 25 °C. Sleep gets worse outside it.':
    'A cabine ficou em {value:1} °C em média nas últimas 24 horas. A faixa de conforto é de 20 a 25 °C. O sono piora fora dela.',
  'The cabin humidity was {value:0} % on average in the last 24 hours. Air below 30% dries eyes, skin and airways.':
    'A umidade da cabine ficou em {value:0}% em média nas últimas 24 horas. O ar abaixo de 30% resseca os olhos, a pele e as vias respiratórias.',
  'The radiation dose was {value:2} mGy/day in the last 2 days. The NASA record of this mission stays near 0.3 mGy each day. A strong solar event can cause nausea and fatigue.':
    'A dose de radiação foi de {value:2} mGy/dia nos últimos 2 dias. O registro da NASA desta missão fica perto de 0,3 mGy por dia. Um evento solar forte pode causar náusea e fadiga.',
  'You slept {night:1} h last night. Short sleep lowers mood and attention and raises fatigue the next day.':
    'Você dormiu {night:1} h na última noite. Dormir pouco baixa o humor e a atenção e aumenta a fadiga no dia seguinte.',
  'You slept {night:1} h last night, and {three:1} h on average in the last 3 nights. Short sleep lowers mood and attention and raises fatigue the next day.':
    'Você dormiu {night:1} h na última noite, e {three:1} h em média nas últimas 3 noites. Dormir pouco baixa o humor e a atenção e aumenta a fadiga no dia seguinte.',
  'You drank {value:1} L in the last day. The minimum is 2.5 litres. Low water can cause headache and dizziness, raise heart rate and lower blood pressure.':
    'Você bebeu {value:1} L no último dia. O mínimo é 2,5 litros. Beber pouca água pode causar dor de cabeça e tontura, aumentar a frequência cardíaca e baixar a pressão arterial.',
  'You ate {last:0}% of your target in the last day. Low food intake lowers blood sugar, strength and mood.':
    'Você comeu {last:0}% da sua meta no último dia. Comer pouco baixa a glicemia, a força e o humor.',
  'You ate {last:0}% of your target in the last day, and {three:0}% on average in the last 3 days. Low food intake lowers blood sugar, strength and mood.':
    'Você comeu {last:0}% da sua meta no último dia, e {three:0}% em média nos últimos 3 dias. Comer pouco baixa a glicemia, a força e o humor.',
  'Your last blood sugar was {value:0} mg/dL. Below 70 mg/dL a person can feel shaky, weak or dizzy.':
    'Sua última glicemia foi de {value:0} mg/dL. Abaixo de 70 mg/dL, a pessoa pode sentir tremores, fraqueza ou tontura.',
  'Your last blood sugar before food was {value:0} mg/dL. The usual limit is 100 mg/dL. High blood sugar can blur vision.':
    'Sua última glicemia em jejum foi de {value:0} mg/dL. O limite habitual é 100 mg/dL. A glicemia alta pode embaçar a visão.',
  'Your body temperature is {value:1} °C. A fever can be the first sign of an infection.':
    'Sua temperatura corporal é de {value:1} °C. Uma febre pode ser o primeiro sinal de uma infecção.',
  'Your body temperature is {value:1} °C. That is {difference:1} °C above your usual {usual:1} °C. A fever can be the first sign of an infection.':
    'Sua temperatura corporal é de {value:1} °C. Isso é {difference:1} °C acima do seu valor habitual de {usual:1} °C. Uma febre pode ser o primeiro sinal de uma infecção.',
  'Your last upper blood pressure was {value:0} mmHg. Below 90 mmHg a person can feel dizzy or weak.':
    'Sua última pressão arterial máxima foi de {value:0} mmHg. Abaixo de 90 mmHg, a pessoa pode sentir tontura ou fraqueza.',
  'Your last upper blood pressure was {value:0} mmHg. Above 140 mmHg it can cause headache.':
    'Sua última pressão arterial máxima foi de {value:0} mmHg. Acima de 140 mmHg, ela pode causar dor de cabeça.',
  'Your heart rate was {value:0} bpm on average in the last 3 hours.': 'Sua frequência cardíaca ficou em {value:0} bpm em média nas últimas 3 horas.',
  'Your heart rate was {value:0} bpm on average in the last 3 hours. Your usual rate is {usual:0} bpm.':
    'Sua frequência cardíaca ficou em {value:0} bpm em média nas últimas 3 horas. Sua frequência habitual é de {usual:0} bpm.',
  'You gave your stress a score of {value:0} of 5. Stress over days makes sleep worse and weakens the immune system.':
    'Você deu nota {value:0} de 5 para o seu estresse. O estresse por vários dias piora o sono e enfraquece o sistema imune.',
  'You gave your stress a score of {value:0} of 5 ({three:1} on average in the last 3 days). Stress over days makes sleep worse and weakens the immune system.':
    'Você deu nota {value:0} de 5 para o seu estresse ({three:1} em média nos últimos 3 dias). O estresse por vários dias piora o sono e enfraquece o sistema imune.',
  'You gave your mood a score of {value:0} of 5. Low mood lowers appetite and the wish to exercise.':
    'Você deu nota {value:0} de 5 para o seu humor. O humor baixo diminui o apetite e a vontade de fazer exercício.',
  'You did {value:0} min of exercise each day on average in the last 7 days. The plan is 120 minutes. Muscles and bones get weak fast in weightlessness.':
    'Você fez {value:0} min de exercício por dia em média nos últimos 7 dias. O plano é de 120 minutos. Músculos e ossos enfraquecem rápido sem gravidade.',
  'This is day {day} of the mission. Eye changes from weightlessness (the syndrome SANS) get more likely after day 30. About 60% of crews on long flights have one sign or more.':
    'Este é o dia {day} da missão. Mudanças nos olhos causadas pela falta de gravidade (a síndrome SANS) ficam mais prováveis depois do dia 30. Cerca de 60% das tripulações em voos longos têm um sinal ou mais.',
  'This is day {day} of the mission. Space motion sickness is common in the first 2 to 4 days.':
    'Este é o dia {day} da missão. O enjoo espacial é comum nos primeiros 2 a 4 dias.',
  'Body fluid moves to the head in weightlessness. A blocked nose, a full face and a light headache are common in flight.':
    'Sem gravidade, os líquidos do corpo vão para a cabeça. Nariz entupido, rosto inchado e dor de cabeça leve são comuns em voo.',
  'Back pain is common in weightlessness, because the spine carries no load.': 'A dor nas costas é comum sem gravidade, porque a coluna não carrega peso.',

  // ---- causes.ts: the explanation of a symptom, for a notification ----
  'This symptom can be an emergency. Tell the crew medical officer and the ground team now.':
    'Este sintoma pode ser uma emergência. Avise agora o oficial médico e a equipe em solo.',
  'Possible causes in the data: {list}': 'Possíveis causas nos dados: {list}',
  'First step: {action}': 'Primeiro passo: {action}',
  'The data of the last days shows no cause for this symptom. Ask the crew member how it started.':
    'Os dados dos últimos dias não mostram causa para este sintoma. Pergunte ao tripulante como o sintoma começou.',
  '{name} also reports this symptom. Look for a cause that they share.': '{name} também relata este sintoma. Procure uma causa em comum.',
  '{names} also report this symptom. Look for a cause that they share.': '{names} também relatam este sintoma. Procure uma causa em comum.',
  '{first} and {second}': '{first} e {second}',
  'No other crew member reports this symptom.': 'Nenhum outro tripulante relata este sintoma.',
  'Other values that can be part of the cause: {list}': 'Outros valores que podem fazer parte da causa: {list}',

  // ---- crew.ts: what changed, inside "{name} {change} than usual" and "The whole crew {changes} than usual" ----
  // Each text must fit after a name and after "A tripulação toda", and before "do que o habitual".
  'sleeps less': 'dorme menos',
  'has a lower mood': 'tem o humor mais baixo',
  'has more stress': 'tem mais estresse',
  'is more tired': 'sente mais cansaço',
  'eats less': 'come menos',
  'drinks less': 'bebe menos água',
  'exercises less': 'faz menos exercício',

  // ---- crew.ts: the patterns across the crew ----
  '{list} and {last}': '{list} e {last}',
  '{value:1} {unit}': '{value:1} {unit}',
  '{value:2} {unit}': '{value:2} {unit}',
  'crew {id}': 'tripulante {id}',
  '{cause} for each of them.': '{cause}, em cada um deles.',
  'They share: {list}': 'Eles têm em comum: {list}',
  'The data shows no cause that they share. Ask what they had in common: food, water, work place and sleep place.':
    'Os dados não mostram uma causa em comum. Pergunte o que eles tiveram em comum: comida, água, local de trabalho e local de dormir.',
  '{count} of {total} crew members report: {symptom}': '{count} de {total} tripulantes relatam: {symptom}',
  '{names} report "{symptom}" in the last {hours} hours.': '{names} relatam "{symptom}" nas últimas {hours} horas.',
  'The same sign of infection in two people can mean that an infection spreads in the cabin.':
    'O mesmo sinal de infecção em duas pessoas pode significar que uma infecção se espalha na cabine.',
  'Keep these crew members apart from the rest, clean hands and surfaces, and tell the flight surgeons.':
    'Mantenha estes tripulantes separados dos outros, limpe as mãos e as superfícies, e avise os médicos de voo.',
  'The crew medical officer talks with each of them and compares the last 2 days.': 'O oficial médico conversa com cada um deles e compara os últimos 2 dias.',
  '{count} crew members have a raised body temperature': '{count} tripulantes estão com a temperatura corporal elevada',
  'A fever in more than one person can mean that an infection spreads in the closed cabin.':
    'Febre em mais de uma pessoa pode significar que uma infecção se espalha na cabine fechada.',
  'The cabin is also hot, and heat alone can raise body temperature. Measure again after 30 minutes in a cooler place.':
    'A cabine também está quente, e só o calor já pode aumentar a temperatura corporal. Meça de novo depois de 30 minutos em um lugar mais fresco.',
  '"{label}": {now} on average in the last 3 days, against the usual {usual}.': '"{label}": {now} em média nos últimos 3 dias, contra o valor habitual de {usual}.',
  'The whole crew {changes} than usual': 'A tripulação toda {changes} do que o habitual',
  'Possible cause in the cabin: {list}': 'Possível causa na cabine: {list}',
  'The cabin data shows no cause. Check the work schedule, the sleep schedule, and how the team works together.':
    'Os dados da cabine não mostram causa. Verifique os horários de trabalho, os horários de sono e como a equipe trabalha em conjunto.',
  'The commander looks at the schedule of the last days with the crew and with the ground team.':
    'O comandante analisa os horários dos últimos dias com a tripulação e com a equipe em solo.',
  'The rest of the crew changed less in this indicator. But the whole crew changed in other indicators in the same days. So the cause is probably the same for all, and this crew member reacts more to it.':
    'O resto da tripulação mudou menos neste indicador. Mas a tripulação toda mudou em outros indicadores nos mesmos dias. Então a causa provavelmente é a mesma para todos, e este tripulante reage mais a ela.',
  'The rest of the crew stayed near the usual values, and the cabin is the same for all. So the cause is probably personal: pain, illness, workload, worry, or the sleep place.':
    'O resto da tripulação ficou perto dos valores habituais, e a cabine é a mesma para todos. Então a causa provavelmente é pessoal: dor, doença, carga de trabalho, preocupação ou o local de dormir.',
  '{name} {change} than usual, more than the rest of the crew': '{name} {change} do que o habitual, e mudou mais do que o resto da tripulação',
  '{name} {change} than usual, and the rest of the crew does not': '{name} {change} do que o habitual, e o resto da tripulação não',
  '"{label}" of {name} is {now} on average in the last 3 days. The usual value of this crew member is {usual}.':
    '"{label}" de {name} está em {now} em média nos últimos 3 dias. O valor habitual deste tripulante é {usual}.',
  'The crew medical officer talks with this crew member in private.': 'O oficial médico conversa com este tripulante em particular.',
  'Only {name} has symptoms from: {title}': 'Só {name} tem sintomas de: {title}',
  '{name} answered "yes" to "{question}" {count} other crew member answered "no".': '{name} respondeu "sim" a "{question}" {count} outro tripulante respondeu "não".',
  '{name} answered "yes" to "{question}" {count} other crew members answered "no".': '{name} respondeu "sim" a "{question}" {count} outros tripulantes responderam "não".',
  'The cabin value is the same for all. So this crew member reacts more to it, or works or sleeps in a place where the value is worse than at the sensor.':
    'O valor da cabine é o mesmo para todos. Então este tripulante reage mais a ele, ou trabalha ou dorme em um lugar onde o valor é pior do que no sensor.',
  'Ask {name} where the symptom started and where they sleep. Measure the cabin value in that place.':
    'Pergunte a {name} onde o sintoma começou e onde dorme. Meça o valor da cabine nesse lugar.',
  'What to do: {action}': 'O que fazer: {action}',
}
