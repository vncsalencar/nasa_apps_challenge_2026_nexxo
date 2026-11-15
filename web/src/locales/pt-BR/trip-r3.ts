// Brazilian Portuguese for the texts of shared/trip/effects.ts: the effects on the body.
// The key is the English text. A key with {name} is a sentence template: the card puts a value in each place.
// A name of a document, a unit, and "CO2", "O2", "NASA" stay as they are.
// The base file web/src/locales/pt-BR.ts has some of the CO2 titles too. The texts here are the same.
export const tripR3: Record<string, string> = {
  // ---------------------------------------------------------------------------------------
  // The hazards
  // ---------------------------------------------------------------------------------------
  CO2: 'CO2',
  O2: 'O2',
  Radiation: 'Radiação',
  'The crew makes CO2, and the scrubber removes it. If the scrubber removes less, the CO2 pressure of the cabin rises. NASA limits the 1-hour average to 3 mmHg.':
    'A tripulação produz CO2, e o removedor de CO2 tira esse CO2 do ar. Se o removedor tira menos, a pressão de CO2 da cabine sobe. A NASA limita a média de 1 hora a 3 mmHg.',
  'The crew uses O2, and the generator or the bottles replace it. NASA sets a target range of 145 to 155 mmHg for the inspired O2 pressure. Too little O2 gives hypoxia. An atmosphere that is rich in O2 can feed a fire.':
    'A tripulação usa O2, e o gerador ou os cilindros repõem esse O2. A NASA define uma faixa-alvo de 145 a 155 mmHg para a pressão de O2 inspirado. Pouco O2 causa hipóxia. Uma atmosfera rica em O2 pode alimentar um incêndio.',
  'Galactic cosmic rays arrive all the time, and shielding is not effective against them. A solar particle event is rare, and shielding is effective against it. NASA limits the dose of a career, the dose of one solar particle event, and the dose in some organs.':
    'Os raios cósmicos galácticos chegam o tempo todo, e a blindagem não é eficaz contra eles. Um evento de partículas solares é raro, e a blindagem é eficaz contra ele. A NASA limita a dose de uma carreira, a dose de um evento de partículas solares e a dose em alguns órgãos.',

  // ---------------------------------------------------------------------------------------
  // The sentences of the "measure" texts
  // ---------------------------------------------------------------------------------------
  'No data.': 'Sem dados.',
  'The source gives one value: {value} {unit}.': 'A fonte dá um só valor: {value} {unit}.',
  'The band goes from {from} to {to} {unit}.': 'A faixa vai de {from} a {to} {unit}.',
  'Limit: {limit} {unit}.': 'Limite: {limit} {unit}.',
  'This is {percent}% of the limit.': 'Isso é {percent}% do limite.',
  'CO2 now: {value} mmHg.': 'CO2 agora: {value} mmHg.',
  '1-hour average: {value} mmHg.': 'Média de 1 hora: {value} mmHg.',
  'Inspired O2 now: {value} mmHg.': 'O2 inspirado agora: {value} mmHg.',
  'The band goes from {from} mmHg down to {to} mmHg.': 'A faixa vai de {from} mmHg para baixo, até {to} mmHg.',
  'The band goes from {from} mmHg up to {to} mmHg.': 'A faixa vai de {from} mmHg para cima, até {to} mmHg.',
  'Lower limit of the 1-hour average: {limit} mmHg.': 'Limite inferior da média de 1 hora: {limit} mmHg.',
  'Absolute lower limit: {limit} mmHg.': 'Limite inferior absoluto: {limit} mmHg.',
  'Upper limit for an unlimited time: {limit} mmHg.': 'Limite superior por tempo ilimitado: {limit} mmHg.',
  'Upper limit for 6 to 9 hours: {limit} mmHg.': 'Limite superior por 6 a 9 horas: {limit} mmHg.',
  'O2 of the cabin gas now: {cabin} mmHg (inspired: {inspired} mmHg, total pressure: {total} mmHg).':
    'O2 do gás da cabine agora: {cabin} mmHg (inspirado: {inspired} mmHg, pressão total: {total} mmHg).',
  'The handbook gives this effect at {value} mmHg.': 'O manual dá este efeito em {value} mmHg.',
  'No comparison. The charts show the absorbed dose in mGy, and this limit is an effective dose in mSv.':
    'Sem comparação. Os gráficos mostram a dose absorvida em mGy, e este limite é uma dose efetiva em mSv.',
  'No solar particle event is active now.': 'Nenhum evento de partículas solares está ativo agora.',
  'A solar particle event is active now.': 'Um evento de partículas solares está ativo agora.',
  'Dose of the last 30 days: {dose} {unit}.': 'Dose dos últimos 30 dias: {dose} {unit}.',
  'Dose of the last 365 days: {dose} {unit}.': 'Dose dos últimos 365 dias: {dose} {unit}.',
  'Dose of this mission: {dose} {unit}.': 'Dose desta missão: {dose} {unit}.',
  'Dose of this mission day: {dose} {unit}.': 'Dose deste dia da missão: {dose} {unit}.',
  'Limit for 30 days: {limit} {unit}.': 'Limite para 30 dias: {limit} {unit}.',
  'Limit for 1 year: {limit} {unit}.': 'Limite para 1 ano: {limit} {unit}.',
  'Limit for a career: {limit} {unit}.': 'Limite para uma carreira: {limit} {unit}.',
  'Rough indicator: the number is {percent}% of the number of the limit. The quantities differ.':
    'Indicador aproximado: o número é {percent}% do número do limite. As grandezas são diferentes.',
  'Rough indicator: the quantities differ.': 'Indicador aproximado: as grandezas são diferentes.',

  // ---------------------------------------------------------------------------------------
  // CO2: titles, what the source reports, steps
  // ---------------------------------------------------------------------------------------
  'Fatigue and a feeling of a full head': 'Fadiga e sensação de cabeça cheia',
  'Crew members of the station reported fatigue and a feeling of a full head between 2.3 and 2.7 mmHg.':
    'Tripulantes da estação relataram fadiga e sensação de cabeça cheia entre 2,3 e 2,7 mmHg.',
  'Missed steps of a procedure, and procedures that go long': 'Passos esquecidos de um procedimento, e procedimentos que demoram mais',
  'Crew members of the station reported missed steps of a procedure, and procedures that went long, between 2.7 and 3.0 mmHg.':
    'Tripulantes da estação relataram passos esquecidos de um procedimento, e procedimentos que demoraram mais, entre 2,7 e 3,0 mmHg.',
  'Headache, worse with more CO2': 'Dor de cabeça, pior com mais CO2',
  'NASA reports headaches between 2.8 and 4.5 mmHg on earlier missions. They get worse with more CO2.':
    'A NASA relata dores de cabeça entre 2,8 e 4,5 mmHg em missões anteriores. Elas pioram com mais CO2.',
  Headache: 'Dor de cabeça',
  'Crew members of the station reported headaches above 3.0 to 3.4 mmHg.': 'Tripulantes da estação relataram dores de cabeça acima de 3,0 a 3,4 mmHg.',
  'CO2 limit of NASA for the 1-hour average': 'Limite de CO2 da NASA para a média de 1 hora',
  'NASA requires that the 1-hour average of the CO2 pressure in the cabin is no more than 3 mmHg.':
    'A NASA exige que a média de 1 hora da pressão de CO2 na cabine seja de no máximo 3 mmHg.',
  'Blurred vision': 'Visão embaçada',
  'NASA reports blurred vision at 3.5 mmHg on earlier missions.': 'A NASA relata visão embaçada em 3,5 mmHg em missões anteriores.',
  'Chronic cough': 'Tosse crônica',
  'NASA reports a chronic cough at 3.5 mmHg on earlier missions.': 'A NASA relata tosse crônica em 3,5 mmHg em missões anteriores.',
  'Poor sleep': 'Sono ruim',
  'NASA reports poor sleep at 3.5 mmHg on earlier missions.': 'A NASA relata sono ruim em 3,5 mmHg em missões anteriores.',
  'Numb or tingling face (5th cranial nerve)': 'Rosto dormente ou com formigamento (5º nervo craniano)',
  'NASA reports an abnormal feeling in the area of the 5th cranial nerve, which serves the face, between 4.5 and 5.0 mmHg on earlier missions.':
    'A NASA relata uma sensação anormal na área do 5º nervo craniano, que atende o rosto, entre 4,5 e 5,0 mmHg em missões anteriores.',
  'Fatigue, malaise, less sleep, and nausea': 'Fadiga, mal-estar, menos sono e náusea',
  'NASA reports fatigue, malaise, less sleep, and nausea above 4.5 mmHg on earlier missions.':
    'A NASA relata fadiga, mal-estar, menos sono e náusea acima de 4,5 mmHg em missões anteriores.',

  'Find and repair the scrubber that removes less CO2, or switch on a spare scrubber.':
    'Encontre e conserte o removedor de CO2 que remove menos, ou ligue um removedor reserva.',
  'Raise the air flow where you work, so that no pocket of CO2 forms near your face.':
    'Aumente o fluxo de ar onde você trabalha, para que nenhum bolsão de CO2 se forme perto do seu rosto.',
  'Raise the air flow at the sleep place. CO2 can stay in a pocket where the air does not move.':
    'Aumente o fluxo de ar no lugar onde você dorme. O CO2 pode ficar em um bolsão onde o ar não se move.',
  'Do less heavy work and exercise for a time. A person makes less CO2 at rest.':
    'Faça menos trabalho pesado e menos exercício por um tempo. Uma pessoa produz menos CO2 em repouso.',
  'Eat more fat and less carbohydrate. NASA says that this can lower the CO2 that the crew makes.':
    'Coma mais gordura e menos carboidrato. A NASA diz que isso pode reduzir o CO2 que a tripulação produz.',
  'Move to a module with less CO2. On the station, the CO2 is not the same in all modules.':
    'Vá para um módulo com menos CO2. Na estação, o CO2 não é igual em todos os módulos.',
  'Keep the 1-hour average at or below 3 mmHg.': 'Mantenha a média de 1 hora em 3 mmHg ou menos.',
  'Keep the 7-day average below 2.5 mmHg. NASA says that this keeps the headache risk below 1%.':
    'Mantenha a média de 7 dias abaixo de 2,5 mmHg. A NASA diz que isso mantém o risco de dor de cabeça abaixo de 1%.',
  'Tell the flight surgeon about the symptom.': 'Avise o médico de voo sobre o sintoma.',
  'Read each step of a procedure aloud, and let a second person check the work.':
    'Leia cada passo do procedimento em voz alta, e peça a uma segunda pessoa que confira o trabalho.',

  // ---------------------------------------------------------------------------------------
  // O2: titles, what the source reports, caveats, steps
  // ---------------------------------------------------------------------------------------
  'Low O2: below the target range (mild hypoxia)': 'O2 baixo: abaixo da faixa-alvo (hipóxia leve)',
  'The target range of NASA for the inspired O2 pressure is 145 to 155 mmHg. NASA accepts mild hypoxia down to 127 mmHg for an unlimited time, if a plan monitors the health of the crew.':
    'A faixa-alvo da NASA para a pressão de O2 inspirado é de 145 a 155 mmHg. A NASA aceita hipóxia leve até 127 mmHg por tempo ilimitado, se um plano acompanha a saúde da tripulação.',
  'Low O2: below the lower limit of NASA': 'O2 baixo: abaixo do limite inferior da NASA',
  'The lower limit of NASA for the inspired O2 pressure is 127 mmHg as a 1-hour average. The absolute lower limit is 122 mmHg.':
    'O limite inferior da NASA para a pressão de O2 inspirado é 127 mmHg como média de 1 hora. O limite inferior absoluto é 122 mmHg.',
  'The limit of 127 mmHg is for a 1-hour average. The app compares the value now.': 'O limite de 127 mmHg vale para uma média de 1 hora. O app compara o valor de agora.',
  'Low O2: loss of night vision': 'O2 baixo: perda da visão noturna',
  'At an O2 pressure of 137 mmHg in the air: the accepted limit of alertness, and loss of night vision. The first symptom is that the pupils get wider.':
    'Com uma pressão de O2 de 137 mmHg no ar: o limite aceito do estado de alerta, e perda da visão noturna. O primeiro sintoma é que as pupilas ficam mais abertas.',
  'Low O2: performance seriously impaired': 'O2 baixo: desempenho seriamente prejudicado',
  'At an O2 pressure of 114 mmHg in the air: performance is seriously impaired. Hallucinations, excitation, and apathy occur.':
    'Com uma pressão de O2 de 114 mmHg no ar: o desempenho fica seriamente prejudicado. Ocorrem alucinações, excitação e apatia.',
  'Low O2: impaired coordination, loss of memory': 'O2 baixo: coordenação prejudicada, perda de memória',
  'At an O2 pressure of 100 mmHg in the air: physical coordination is impaired. The person is emotionally upset. Paralysis and loss of memory occur.':
    'Com uma pressão de O2 de 100 mmHg no ar: a coordenação física fica prejudicada. A pessoa fica emocionalmente abalada. Ocorrem paralisia e perda de memória.',
  'Low O2: unconsciousness': 'O2 baixo: perda de consciência',
  'At an O2 pressure of 84 mmHg in the air: the person becomes unconscious in the end, and this cannot be reversed.':
    'Com uma pressão de O2 de 84 mmHg no ar: a pessoa acaba perdendo a consciência, e isso não pode ser revertido.',
  'No O2: death in minutes': 'Sem O2: morte em minutos',
  'At an O2 pressure of 0 to 46 mmHg in the air: the person becomes unconscious almost at once, with convulsions and paralysis. Death comes in 90 to 180 seconds.':
    'Com uma pressão de O2 de 0 a 46 mmHg no ar: a pessoa perde a consciência quase na hora, com convulsões e paralisia. A morte vem em 90 a 180 segundos.',
  'The handbook gives approximate values for the O2 pressure of the air, and it says that this section is under evaluation.':
    'O manual dá valores aproximados para a pressão de O2 do ar, e diz que esta seção está em avaliação.',
  'The app has the inspired O2 pressure. It turns this value into the O2 pressure of the dry cabin gas with the formula of the NASA standard and the total pressure of the cabin.':
    'O app tem a pressão de O2 inspirado. Ele transforma esse valor na pressão de O2 do gás seco da cabine com a fórmula da norma da NASA e a pressão total da cabine.',
  'High O2: above the target range, higher fire risk': 'O2 alto: acima da faixa-alvo, maior risco de incêndio',
  'The target range of NASA ends at 155 mmHg of inspired O2. NASA accepts up to 356 mmHg for an unlimited time. But the standard also says that an atmosphere that is rich in O2 is a safety hazard, because it can feed a fire.':
    'A faixa-alvo da NASA termina em 155 mmHg de O2 inspirado. A NASA aceita até 356 mmHg por tempo ilimitado. Mas a norma também diz que uma atmosfera rica em O2 é um perigo para a segurança, porque pode alimentar um incêndio.',
  'The fire risk depends on the O2 percentage of the cabin gas and on the materials. The app has no number for the fire risk. The band shows only how far the O2 is above the target range.':
    'O risco de incêndio depende da porcentagem de O2 do gás da cabine e dos materiais. O app não tem um número para o risco de incêndio. A faixa mostra só o quanto o O2 está acima da faixa-alvo.',
  'High O2: above the upper limit of NASA': 'O2 alto: acima do limite superior da NASA',
  'The upper limit of NASA for the inspired O2 pressure is 356 mmHg for an unlimited time, and 791 mmHg for 6 to 9 hours.':
    'O limite superior da NASA para a pressão de O2 inspirado é 356 mmHg por tempo ilimitado, e 791 mmHg por 6 a 9 horas.',

  'Put on an oxygen mask when you feel a symptom of hypoxia. NASA trains the crew to do this.':
    'Coloque uma máscara de oxigênio quando sentir um sintoma de hipóxia. A NASA treina a tripulação para fazer isso.',
  'Put on an oxygen mask. On the Space Shuttle, the crew put on masks if the O2 pressure fell below 121 mmHg.':
    'Coloque uma máscara de oxigênio. No ônibus espacial, a tripulação colocava máscaras se a pressão de O2 caísse abaixo de 121 mmHg.',
  'Give the crew more O2 from a mask or a bottle. NASA names this as the main treatment for hypoxia.':
    'Dê mais O2 à tripulação com uma máscara ou um cilindro. A NASA indica isso como o principal tratamento para a hipóxia.',
  'Watch the other crew members for symptoms. A person with hypoxia often does not notice it.':
    'Observe se os outros tripulantes têm sintomas. Uma pessoa com hipóxia muitas vezes não percebe.',
  'Do less heavy work and exercise. A person uses less O2 at rest.': 'Faça menos trabalho pesado e menos exercício. Uma pessoa usa menos O2 em repouso.',
  'Repair the oxygen generator, or add O2 from the bottles, until the O2 is in the target range.':
    'Conserte o gerador de oxigênio, ou adicione O2 dos cilindros, até o O2 ficar na faixa-alvo.',
  'Lower the O2 pressure of the cabin gas. NASA names this as the main treatment for too much O2.':
    'Reduza a pressão de O2 do gás da cabine. A NASA indica isso como o principal tratamento para O2 em excesso.',
  'Keep the O2 level low. NASA says that this reduces the potential for fire in a spacecraft.':
    'Mantenha o nível de O2 baixo. A NASA diz que isso reduz o potencial de incêndio em uma nave.',
  'Lower the rate of the oxygen generator, or close the O2 bottles.': 'Reduza a taxa do gerador de oxigênio, ou feche os cilindros de O2.',
  'Tell the flight surgeon about each symptom.': 'Avise o médico de voo sobre cada sintoma.',

  // ---------------------------------------------------------------------------------------
  // Radiation: titles and what the source reports
  // ---------------------------------------------------------------------------------------
  'Blood-forming organs (bone marrow): dose limit': 'Órgãos que formam o sangue (medula óssea): limite de dose',
  'NASA limits the dose in the blood-forming organs to 250 mGy-Eq in 30 days and 500 mGy-Eq in 1 year. The standard gives no career limit for these organs.':
    'A NASA limita a dose nos órgãos que formam o sangue a 250 mGy-Eq em 30 dias e 500 mGy-Eq em 1 ano. A norma não dá um limite de carreira para esses órgãos.',
  'Heart and blood vessels: dose limit': 'Coração e vasos sanguíneos: limite de dose',
  'NASA limits the dose in the circulatory system to 250 mGy-Eq in 30 days, 500 mGy-Eq in 1 year, and 1,000 mGy-Eq in a career. NASA computes this dose as the average over the heart muscle and the arteries next to it.':
    'A NASA limita a dose no sistema circulatório a 250 mGy-Eq em 30 dias, 500 mGy-Eq em 1 ano e 1.000 mGy-Eq em uma carreira. A NASA calcula essa dose como a média no músculo do coração e nas artérias ao lado dele.',
  'Brain and nerves: dose limit': 'Cérebro e nervos: limite de dose',
  'NASA limits the dose in the central nervous system to 500 mGy in 30 days, 1,000 mGy in 1 year, and 1,500 mGy in a career. NASA computes this dose at the hippocampus, a part of the brain.':
    'A NASA limita a dose no sistema nervoso central a 500 mGy em 30 dias, 1.000 mGy em 1 ano e 1.500 mGy em uma carreira. A NASA calcula essa dose no hipocampo, uma parte do cérebro.',
  'Cancer risk: dose limit of a career': 'Risco de câncer: limite de dose de uma carreira',
  'NASA limits the effective dose of a whole career to less than 600 mSv, for all ages and sexes. NASA set this limit to keep the mean risk of death from a cancer that the radiation causes below 3%.':
    'A NASA limita a dose efetiva de uma carreira inteira a menos de 600 mSv, para todas as idades e sexos. A NASA definiu esse limite para manter abaixo de 3% o risco médio de morte por um câncer que a radiação causa.',
  'Lens of the eye: cataract': 'Cristalino do olho: catarata',
  'NASA limits the dose in the lens of the eye to 1,000 mGy-Eq in 30 days, 2,000 mGy-Eq in 1 year, and 4,000 mGy-Eq in a career. These limits are to prevent a severe cataract in the first 5 years, for example after a solar particle event.':
    'A NASA limita a dose no cristalino do olho a 1.000 mGy-Eq em 30 dias, 2.000 mGy-Eq em 1 ano e 4.000 mGy-Eq em uma carreira. Esses limites servem para evitar uma catarata grave nos primeiros 5 anos, por exemplo depois de um evento de partículas solares.',
  'Skin: dose limit': 'Pele: limite de dose',
  'NASA limits the dose in the skin to 1,500 mGy-Eq in 30 days, 3,000 mGy-Eq in 1 year, and 6,000 mGy-Eq in a career.':
    'A NASA limita a dose na pele a 1.500 mGy-Eq em 30 dias, 3.000 mGy-Eq em 1 ano e 6.000 mGy-Eq em uma carreira.',
  'Solar particle event: dose limit for one event': 'Evento de partículas solares: limite de dose para um evento',
  'NASA requires that the program protects the crew from the reference solar particle event to less than an effective dose of 250 mSv. NASA chose this value to minimize acute effects.':
    'A NASA exige que o programa proteja a tripulação do evento de partículas solares de referência, de modo que a dose efetiva fique abaixo de 250 mSv. A NASA escolheu esse valor para minimizar os efeitos agudos.',
  'Heart and blood vessels: disease in later years': 'Coração e vasos sanguíneos: doença anos depois',
  'Studies of people on Earth find more disease of the heart and the blood vessels in later years after a dose of 500 mGy or more of gamma rays or x-rays.':
    'Estudos com pessoas na Terra encontram mais doenças do coração e dos vasos sanguíneos, anos depois, após uma dose de 500 mGy ou mais de raios gama ou raios X.',
  'Acute radiation sickness: nausea, vomiting, fatigue': 'Doença aguda da radiação: náusea, vômito, fadiga',
  'A dose of 0.5 to 1 Gy in a short time causes mild nausea, vomiting, loss of appetite, and fatigue in a small number of persons, and minor damage to the blood-forming system. From 1 to 2 Gy, these effects increase significantly.':
    'Uma dose de 0,5 a 1 Gy em pouco tempo causa náusea leve, vômito, perda de apetite e fadiga em um pequeno número de pessoas, e um dano pequeno ao sistema que forma o sangue. De 1 a 2 Gy, esses efeitos aumentam de forma significativa.',
  'Skin: redness after a solar particle event': 'Pele: vermelhidão depois de um evento de partículas solares',
  'The dose that gives redness of the skin in 10% of persons is estimated as 4 Gy. If the dose arrives slowly, it must be about 3 times higher for the same effect.':
    'A dose que causa vermelhidão da pele em 10% das pessoas é estimada em 4 Gy. Se a dose chega devagar, ela precisa ser cerca de 3 vezes maior para o mesmo efeito.',

  // ---------------------------------------------------------------------------------------
  // Radiation: the texts of the caveats
  // ---------------------------------------------------------------------------------------
  'The charts show a dose equivalent in mSv, measured at one place of a spacecraft.': 'Os gráficos mostram uma dose equivalente em mSv, medida em um ponto de uma nave.',
  'The charts show an absorbed dose in mGy, measured at one place of a spacecraft.': 'Os gráficos mostram uma dose absorvida em mGy, medida em um ponto de uma nave.',
  'The limit is an effective dose in mSv: a weighted sum of the doses in the organs, from a model of NASA. The two are close, but they are not the same quantity.':
    'O limite é uma dose efetiva em mSv: uma soma ponderada das doses nos órgãos, de um modelo da NASA. As duas são próximas, mas não são a mesma grandeza.',
  'The limit is an effective dose in mSv. These are different quantities, and the app does not convert. Switch the charts to mSv to compare.':
    'O limite é uma dose efetiva em mSv. São grandezas diferentes, e o app não converte. Mude os gráficos para mSv para comparar.',
  'The limit is a dose in mGy-Eq inside one organ, where the dose differs from the dose at the instrument.':
    'O limite é uma dose em mGy-Eq dentro de um órgão, onde a dose é diferente da dose no instrumento.',
  'The limit is an absorbed dose in mGy inside one organ, where the dose differs from the dose at the instrument.':
    'O limite é uma dose absorvida em mGy dentro de um órgão, onde a dose é diferente da dose no instrumento.',
  'The source gives an absorbed dose of gamma rays or x-rays in the body. Less is known about the effect of the particles in space.':
    'A fonte dá uma dose absorvida de raios gama ou raios X no corpo. Sabe-se menos sobre o efeito das partículas do espaço.',
  'A dose in mGy-Eq and a dose equivalent use different factors for the biological effect.': 'Uma dose em mGy-Eq e uma dose equivalente usam fatores diferentes para o efeito biológico.',
  'A dose in mGy-Eq is the absorbed dose times a factor: 1.5 for protons and 2.5 for heavy ions. So at the same place, the number in mGy-Eq is the larger one.':
    'Uma dose em mGy-Eq é a dose absorvida vezes um fator: 1,5 para prótons e 2,5 para íons pesados. Então, no mesmo ponto, o número em mGy-Eq é o maior.',
  'A dose equivalent is the absorbed dose times a quality factor of 1 or more. So at the same place, the number in mSv is the larger one.':
    'Uma dose equivalente é a dose absorvida vezes um fator de qualidade de 1 ou mais. Então, no mesmo ponto, o número em mSv é o maior.',
  'The app does not convert, so read the result as a rough indicator only.': 'O app não converte, então leia o resultado só como um indicador aproximado.',
  'The app counts this mission only, and the dose of earlier flights adds to the career dose.': 'O app conta só esta missão, e a dose de voos anteriores se soma à dose da carreira.',
  'The limit is for one whole event, and the app compares the dose of one mission day, with the cosmic rays of that day in it.':
    'O limite vale para um evento inteiro, e o app compara a dose de um dia da missão, que inclui os raios cósmicos desse dia.',
  'The source speaks of a dose in a short time, and the app compares the dose of one mission day, with the cosmic rays of that day in it.':
    'A fonte fala de uma dose em pouco tempo, e o app compara a dose de um dia da missão, que inclui os raios cósmicos desse dia.',
  'This value is a dose in the skin. During work outside, the skin can get up to about 10 times the dose of the organs inside the body.':
    'Este valor é uma dose na pele. Durante o trabalho fora da nave, a pele pode receber até cerca de 10 vezes a dose dos órgãos dentro do corpo.',

  // ---------------------------------------------------------------------------------------
  // Radiation: steps
  // ---------------------------------------------------------------------------------------
  'Go to the storm shelter when the radiation alert comes.': 'Vá para o abrigo contra tempestades quando o alerta de radiação chegar.',
  'Build the storm shelter in the crew quarters: put the water containers and the materials with much hydrogen around the crew.':
    'Monte o abrigo contra tempestades nos alojamentos da tripulação: coloque os recipientes de água e os materiais com muito hidrogênio em volta da tripulação.',
  'End the work outside in less than 2 hours after the alert, and go behind shielding.':
    'Termine o trabalho fora da nave em menos de 2 horas depois do alerta, e vá para trás da blindagem.',
  'Wear your personal dosimeter inside the spacecraft and during work outside.': 'Use o seu dosímetro pessoal dentro da nave e durante o trabalho fora dela.',
  'Keep each exposure as low as you reasonably can. NASA requires this for all radiation exposures (ALARA).':
    'Mantenha cada exposição tão baixa quanto for razoável. A NASA exige isso para todas as exposições à radiação (ALARA).',
  'Sleep and rest in the best shielded part of the cabin.': 'Durma e descanse na parte da cabine com a melhor blindagem.',
  'Plan the flight near solar maximum. Cosmic rays are lower then. Solar particle events occur more often then, so the storm shelter is more important.':
    'Planeje o voo perto do máximo solar. Os raios cósmicos são mais fracos nesse período. Os eventos de partículas solares ocorrem mais vezes nesse período, então o abrigo contra tempestades é mais importante.',
  'Choose a faster flight where the mission permits it. A shorter time in space gives a lower dose.':
    'Escolha um voo mais rápido quando a missão permitir. Menos tempo no espaço dá uma dose menor.',
  'Tell the flight surgeon about each symptom, for example nausea.': 'Avise o médico de voo sobre cada sintoma, por exemplo náusea.',

  // ---------------------------------------------------------------------------------------
  // More that the sources say (EFFECT_NOTES)
  // ---------------------------------------------------------------------------------------
  'The NASA Human Research Program says: the radiation in space can raise the number of cancer cases and of cancer deaths in the crew.':
    'O Human Research Program da NASA diz: a radiação no espaço pode aumentar o número de casos de câncer e de mortes por câncer na tripulação.',
  'No study of people exists for space radiation. The risk estimate of NASA is uncertain: the upper end of its 95% range is 3 to 4 times the central value.':
    'Não existe nenhum estudo com pessoas para a radiação espacial. A estimativa de risco da NASA é incerta: o extremo superior do seu intervalo de 95% é de 3 a 4 vezes o valor central.',
  'The standard has a second limit for heavy ions alone (charge of 10 or more): 100 mGy in 1 year and 250 mGy in a career. The app has no dose of heavy ions alone, so it does not compare that limit.':
    'A norma tem um segundo limite só para íons pesados (carga de 10 ou mais): 100 mGy em 1 ano e 250 mGy em uma carreira. O app não tem a dose só dos íons pesados, então não compara esse limite.',
  'Research on animals suggests that radiation can lower the thinking performance for a short time. It is not certain that this is true for people.':
    'Pesquisas com animais sugerem que a radiação pode reduzir o desempenho do raciocínio por pouco tempo. Não é certo que isso vale para pessoas.',
  'The NASA Human Research Program says: radiation exposure damages the central nervous system. It can change the thinking, reduce the control of movement, and change the behavior.':
    'O Human Research Program da NASA diz: a exposição à radiação danifica o sistema nervoso central. Ela pode alterar o raciocínio, reduzir o controle dos movimentos e mudar o comportamento.',
  'The data on astronauts does not show a higher risk of death from disease of the heart and the blood vessels. But most missions were 4 to 6 months long, and the follow-up is limited.':
    'Os dados sobre astronautas não mostram um risco maior de morte por doenças do coração e dos vasos sanguíneos. Mas a maioria das missões durou de 4 a 6 meses, e o acompanhamento é limitado.',
  'Cosmic rays add a risk of small cataracts at lower doses. These can get severe after more than 5 years, and the measures of today cannot prevent them. NASA accepts this risk.':
    'Os raios cósmicos somam um risco de cataratas pequenas com doses menores. Elas podem ficar graves depois de mais de 5 anos, e as medidas de hoje não conseguem evitar essas cataratas. A NASA aceita esse risco.',
  'Acute radiation sickness, for example nausea, vomiting, and fatigue, can occur from the dose in a mission, and also skin injuries and loss of blood-forming cells.':
    'A doença aguda da radiação, por exemplo náusea, vômito e fadiga, pode ocorrer por causa da dose em uma missão, e também lesões na pele e perda de células que formam o sangue.',
  'Inside a spacecraft, shielding works against solar particle events. Acute radiation sickness is then extremely unlikely, except when the crew also works outside.':
    'Dentro de uma nave, a blindagem funciona contra eventos de partículas solares. A doença aguda da radiação é então extremamente improvável, exceto quando a tripulação também trabalha fora da nave.',
  'Too much O2 can give toxic O2 levels. NASA says that this can lead to problems of the breathing or to injury of the tissue.':
    'O2 em excesso pode levar a níveis tóxicos de O2. A NASA diz que isso pode causar problemas na respiração ou lesão nos tecidos.',
  'A fast change from normal O2 to low O2 can give symptoms of mountain sickness: headache, nausea, dizziness, or fatigue.':
    'Uma mudança rápida de O2 normal para O2 baixo pode causar sintomas do mal da montanha: dor de cabeça, náusea, tontura ou fadiga.',
  'Low O2 can also come from a loss of cabin pressure, a failure of the life support system, a toxic exposure, or an illness or injury.':
    'O O2 baixo também pode vir de uma perda de pressão da cabine, de uma falha do sistema de suporte à vida, de uma exposição tóxica, ou de uma doença ou lesão.',
  'Hypoxia changes the thinking, at times with no sign that the crew can notice. It lowers color vision, night vision, and side vision. It gives fatigue, nausea, headache, dizziness, mood changes, poor sleep, and fast breathing.':
    'A hipóxia altera o raciocínio, às vezes sem nenhum sinal que a tripulação consiga perceber. Ela reduz a visão de cores, a visão noturna e a visão lateral. Ela causa fadiga, náusea, dor de cabeça, tontura, mudanças de humor, sono ruim e respiração acelerada.',
  'NASA says: an average of 7 days below 2.5 mmHg keeps the risk of headache below 1%.':
    'A NASA diz: uma média de 7 dias abaixo de 2,5 mmHg mantém o risco de dor de cabeça abaixo de 1%.',

  // ---------------------------------------------------------------------------------------
  // The sources: the short names. A name with no English word stays as it is.
  // ---------------------------------------------------------------------------------------
  'NASA-STD-3001 Vol. 1, table 4.8-1': 'NASA-STD-3001 Vol. 1, tabela 4.8-1',
  'NASA-STD-3001 Vol. 1 [V1 4030]': 'NASA-STD-3001 Vol. 1 [V1 4030]',
  'NASA-STD-3001 Vol. 1 [V1 4031]': 'NASA-STD-3001 Vol. 1 [V1 4031]',
  'NASA-STD-3001 Vol. 1 [V1 4029]': 'NASA-STD-3001 Vol. 1 [V1 4029]',
  'NASA-STD-3001 Vol. 1, section 4.8.4': 'NASA-STD-3001 Vol. 1, seção 4.8.4',
  'NASA-STD-3001 Vol. 2 [V2 6162]': 'NASA-STD-3001 Vol. 2 [V2 6162]',
  'NASA-STD-3001 Vol. 2 [V2 6003]': 'NASA-STD-3001 Vol. 2 [V2 6003]',
  'NASA-STD-3001 Vol. 2 [V2 6004]': 'NASA-STD-3001 Vol. 2 [V2 6004]',
  'NASA OCHMO-TB-020': 'NASA OCHMO-TB-020',
  'NASA OCHMO-TB-003': 'NASA OCHMO-TB-003',
  'NASA OCHMO-TB-002': 'NASA OCHMO-TB-002',
  'NASA OCHMO-TB-008': 'NASA OCHMO-TB-008',
  'NASA OCHMO-TB-004': 'NASA OCHMO-TB-004',
  'Law & Alexander, NTRS 20150019624': 'Law e Alexander, NTRS 20150019624',
  'NASA HIDH, table 6.2-4': 'NASA HIDH, tabela 6.2-4',
  'NASA HIDH, section 6.2.2.2.1': 'NASA HIDH, seção 6.2.2.2.1',
  'Wu et al., NASA HRP evidence book': 'Wu e outros, livro de evidências do NASA HRP',
  'NASA HRP, Risk of Radiation Carcinogenesis': 'NASA HRP, Risk of Radiation Carcinogenesis',
  'NASA HRP, cardiovascular risk': 'NASA HRP, risco cardiovascular',
  'NASA HRP, cognitive and behavioral risk': 'NASA HRP, risco cognitivo e comportamental',
  'NASA HRP, hypoxia risk': 'NASA HRP, risco de hipóxia',
  'NASA HRP, Space Radiation': 'NASA HRP, Space Radiation',

  // ---------------------------------------------------------------------------------------
  // The sources: the full names. The name of the document stays in English.
  // ---------------------------------------------------------------------------------------
  'NASA-STD-3001 Volume 1, revision C (2023), section 4.8.2, table 4.8-1 "Dose Limits for Career/Non-Cancer Effects (in mGy-Eq. or mGy)", page 40':
    'NASA-STD-3001 Volume 1, revisão C (2023), seção 4.8.2, tabela 4.8-1 "Dose Limits for Career/Non-Cancer Effects (in mGy-Eq. or mGy)", página 40',
  'NASA-STD-3001 Volume 1, revision C (2023), requirement [V1 4030] "Career Space Permissible Exposure Limit for Spaceflight Radiation", page 39':
    'NASA-STD-3001 Volume 1, revisão C (2023), requisito [V1 4030] "Career Space Permissible Exposure Limit for Spaceflight Radiation", página 39',
  'NASA-STD-3001 Volume 1, revision C (2023), requirement [V1 4031] "Radiation Limits – Solar Particle Events", page 41':
    'NASA-STD-3001 Volume 1, revisão C (2023), requisito [V1 4031] "Radiation Limits – Solar Particle Events", página 41',
  'NASA-STD-3001 Volume 1, revision C (2023), requirement [V1 4029] "As Low as Reasonably Achievable (ALARA) Principle", page 39':
    'NASA-STD-3001 Volume 1, revisão C (2023), requisito [V1 4029] "As Low as Reasonably Achievable (ALARA) Principle", página 39',
  'NASA-STD-3001 Volume 1, revision C (2023), rationale of requirement [V1 4032], page 43': 'NASA-STD-3001 Volume 1, revisão C (2023), justificativa do requisito [V1 4032], página 43',
  'NASA-STD-3001 Volume 2, revision F (2026), requirement [V2 6162] "Personal Monitoring of Space Radiation Exposure", section 6.8.1.4':
    'NASA-STD-3001 Volume 2, revisão F (2026), requisito [V2 6162] "Personal Monitoring of Space Radiation Exposure", seção 6.8.1.4',
  'NASA-STD-3001 Volume 2, revision F (2026), requirement [V2 6003] and table 6.2-1 "Inspired Oxygen Partial Pressure Exposure Ranges", section 6.2.1.2':
    'NASA-STD-3001 Volume 2, revisão F (2026), requisito [V2 6003] e tabela 6.2-1 "Inspired Oxygen Partial Pressure Exposure Ranges", seção 6.2.1.2',
  'NASA-STD-3001 Volume 2, revision F (2026), requirement [V2 6004] "Nominal Vehicle/Habitat Carbon Dioxide Levels", section 6.2.1.3':
    'NASA-STD-3001 Volume 2, revisão F (2026), requisito [V2 6004] "Nominal Vehicle/Habitat Carbon Dioxide Levels", seção 6.2.1.3',
  'NASA technical brief OCHMO-TB-020, Design for Ionizing Radiation Protection, revision G (2025)':
    'Documento técnico OCHMO-TB-020 da NASA, Design for Ionizing Radiation Protection, revisão G (2025)',
  'NASA technical brief OCHMO-TB-003, Habitable Atmosphere, revision A (2023)': 'Documento técnico OCHMO-TB-003 da NASA, Habitable Atmosphere, revisão A (2023)',
  'NASA technical brief OCHMO-TB-002, Environmental Control & Life Support System (ECLSS), revision B (2023), page 10':
    'Documento técnico OCHMO-TB-002 da NASA, Environmental Control & Life Support System (ECLSS), revisão B (2023), página 10',
  'NASA technical brief OCHMO-TB-008, Fire Protection, revision A (2023), page 6': 'Documento técnico OCHMO-TB-008 da NASA, Fire Protection, revisão A (2023), página 6',
  'NASA technical brief OCHMO-TB-004, Carbon Dioxide (CO2), revision D': 'Documento técnico OCHMO-TB-004 da NASA, Carbon Dioxide (CO2), revisão D',
  'NASA technical brief OCHMO-TB-004, Carbon Dioxide (CO2), revision D, page 4': 'Documento técnico OCHMO-TB-004 da NASA, Carbon Dioxide (CO2), revisão D, página 4',
  'Law and Alexander, CO2 on the International Space Station: An Operations Update. NASA document NTRS 20150019624':
    'Law e Alexander, CO2 on the International Space Station: An Operations Update. Documento NTRS 20150019624 da NASA',
  'NASA Human Integration Design Handbook, NASA/SP-2010-3407 revision 1 (2014), table 6.2-4 "Effects of Hypoxia", page 343':
    'NASA Human Integration Design Handbook, NASA/SP-2010-3407 revisão 1 (2014), tabela 6.2-4 "Effects of Hypoxia", página 343',
  'NASA Human Integration Design Handbook, NASA/SP-2010-3407 revision 1 (2014), section 6.2.2.2.1, page 344':
    'NASA Human Integration Design Handbook, NASA/SP-2010-3407 revisão 1 (2014), seção 6.2.2.2.1, página 344',
  'Wu, Huff, Casey, Kim, and Cucinotta, "Risk of Acute Radiation Syndromes Due to Solar Particle Events", chapter 5 of "Human Health and Performance Risks of Space Exploration Missions" (evidence book of the NASA Human Research Program), pages 173 to 177':
    'Wu, Huff, Casey, Kim e Cucinotta, "Risk of Acute Radiation Syndromes Due to Solar Particle Events", capítulo 5 de "Human Health and Performance Risks of Space Exploration Missions" (livro de evidências do Human Research Program da NASA), páginas 173 a 177',
  'NASA Human Research Roadmap, "Risk of Radiation Carcinogenesis" (web page, published 2026-08-17)':
    'NASA Human Research Roadmap, "Risk of Radiation Carcinogenesis" (página web, publicada em 2026-08-17)',
  'NASA Human Research Roadmap, "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes" (web page, published 2025-05-13)':
    'NASA Human Research Roadmap, "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes" (página web, publicada em 2025-05-13)',
  'NASA Human Research Roadmap, "Risk of Adverse Cognitive or Behavioral Changes and Psychiatric Disorders Leading to In-mission Health and Performance and Long-term Health Effects" (web page, published 2025-05-13)':
    'NASA Human Research Roadmap, "Risk of Adverse Cognitive or Behavioral Changes and Psychiatric Disorders Leading to In-mission Health and Performance and Long-term Health Effects" (página web, publicada em 2025-05-13)',
  'NASA Human Research Roadmap, "Risk of Reduced Crew Health and Performance Due to Hypoxia" (web page, published 2025-05-13)':
    'NASA Human Research Roadmap, "Risk of Reduced Crew Health and Performance Due to Hypoxia" (página web, publicada em 2025-05-13)',
  'NASA Human Research Program, "Space Radiation" (web page of the five hazards of human spaceflight)':
    'NASA Human Research Program, "Space Radiation" (página web dos cinco perigos do voo espacial humano)',
}
