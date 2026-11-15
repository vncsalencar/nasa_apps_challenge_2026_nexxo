// Brazilian Portuguese for the texts of shared/trip/lifesupport.ts and shared/trip/calibration.ts.
// The key is the English text. Each key comes from the shared code, so a change of the English
// text can not leave an old key here.
import { EXERCISE90_MAPPING, METABOLIC, O2_SOURCE, OGA, SABATIER, SCRUBBER } from '../../../../shared/trip/lifesupport.ts'
import { CALIBRATION_NOTE } from '../../../../shared/trip/calibration.ts'

export const tripL: Record<string, string> = {
  // The crew: O2 use and CO2 output.
  [METABOLIC.hidh.label]: 'Taxas do manual da NASA',
  [METABOLIC.hidh.says]:
    'Uma pessoa usa 3,60 (sono), 5,68 (nominal) e 39,40 (exercício a 75% do VO2max) × 10⁻⁴ kg de O2 por minuto, e produz 4,55, 7,2 e 49,85 × 10⁻⁴ kg de CO2 por minuto. ' +
    'O dia do manual tem 8 horas de sono e 30 minutos de exercício. Ele dá 0,82 kg de O2 e 1,04 kg de CO2. O manual supõe um quociente respiratório de 0,92.',
  [METABOLIC.exercise90.label]: 'Missão longa, 90 minutos de exercício',
  [METABOLIC.exercise90.says]:
    'Uma pessoa usa 0,37 (sono) e 0,59 (nominal) g de O2 por minuto, e produz 0,44 e 0,69 g de CO2 por minuto. ' +
    'O dia do artigo tem 8 horas de sono, 30 minutos de exercício aeróbico e 60 minutos de exercício resistido. Ele dá 0,89 kg de O2 e 1,08 kg de CO2.',
  [EXERCISE90_MAPPING]:
    'O artigo dá duas taxas de exercício: aeróbico (O2 3,99 e CO2 5,22 g por minuto, 30 minutos) e resistido (1,43 e 1,89 g por minuto, 60 minutos). ' +
    'Nossa escolha: uma taxa de exercício, a média dos 90 minutos (O2 2,28 e CO2 3,00 g por minuto). O total diário só é igual ao do artigo quando a rotina tem 90 minutos de exercício.',

  // O2.
  [O2_SOURCE.quantity]: 'Pressão parcial de O2 inspirado (PIO2)',
  [O2_SOURCE.formula]: 'PIO2 = (pressão total − 47 mmHg) × fração de O2 do gás seco da cabine',
  [O2_SOURCE.says]:
    'O sistema deve manter a pressão parcial de O2 inspirado (PIO2) nas faixas da tabela 6.2-1. A faixa-alvo para O2 normal é de 145 a 155 mmHg. ' +
    'O limite inferior para hipóxia leve é 127 mmHg como média de 1 hora, com um limite inferior absoluto de 122 mmHg. O limite superior por tempo ilimitado é 356 mmHg.',
  [OGA.says]:
    'O gerador de oxigênio da estação (OGA) produz O2 a partir da água por eletrólise, a uma taxa que a tripulação escolhe, até 9,25 kg por dia. ' +
    'A NASA diz que isso abastece 10,88 pessoas a 0,85 kg de O2 por pessoa e por dia. A NASA projeta o próximo gerador para uma tripulação de 4 e uma missão de 3 anos.',
  [SABATIER.says]:
    'O Advanced Closed Loop System da ESA na estação tem um reator Sabatier. Ele produz água e metano a partir de CO2 e hidrogênio. Depois a eletrólise produz O2 a partir da água. ' +
    'A ESA diz que o sistema recicla metade do CO2 e produz O2 para três astronautas.',

  // CO2 removal.
  [SCRUBBER.says]:
    'O sistema de remoção de CO2 da estação (CDRA) com os dois leitos remove pelo menos 1,723 × ppCO2 − 0,37975 kg de CO2 por dia, de 2,0 a 3,9 mmHg. ' +
    'Um leito remove metade disso. O modelo também usa a equação fora de 2,0 a 3,9 mmHg, o que é uma suposição.',

  // The check against the RR-9 record.
  [CALIBRATION_NOTE]:
    'O modelo recebe o número de tripulantes da estação: 6 pessoas, depois 3, depois 6. Ele começa no seu próprio padrão diário para 6 pessoas. A tripulação segue a rotina padrão em UTC. ' +
    'Um número é ajustado com este registro: a outra remoção de CO2 da estação, 0,66 vez um CDRA. Ele faz o nível do modelo com 6 pessoas ser igual à média do registro antes da mudança da tripulação. ' +
    'Por isso o nível com 6 pessoas não é um teste. O teste é a queda depois que 3 pessoas saíram, o nível com 3 pessoas e a subida depois que 3 pessoas chegaram. ' +
    'Um sensor vê efeitos locais, e o modelo não sabe quando o solo mudou a remoção de CO2.',
}
