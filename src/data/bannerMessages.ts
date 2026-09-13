export interface BannerMessage {
  id: string;
  category: 'greeting' | 'weather' | 'news' | 'quote' | 'anniversary' | 'tip';
  tag: string;
  headline: string;
  subtext?: string;
  icon: string;
  colorScheme?: 'rose' | 'amber' | 'emerald' | 'cyan' | 'purple' | 'blue';
}

// 1. NOTICIAS ACTUALES Y DE ACTUALIDAD EN RUTA (Alta prioridad)
export const CURRENT_NEWS_MESSAGES: BannerMessage[] = [
  {
    id: 'news-traffic-1',
    category: 'news',
    tag: 'TRÁFICO & VIALIDAD',
    headline: 'Campaña especial de la DGT de control de velocidad y distancia',
    subtext: '★ Precaución en tramos interurbanos y enlaces de autovía ★',
    icon: '🚗',
    colorScheme: 'amber',
  },
  {
    id: 'news-space-1',
    category: 'news',
    tag: 'EXPLORACIÓN ESPACIAL',
    headline: 'El telescopio James Webb halla firmas de vapor de agua en exoplanetas',
    subtext: '★ Nuevos avances en la búsqueda de mundos habitables ★',
    icon: '🔭',
    colorScheme: 'cyan',
  },
  {
    id: 'news-auto-1',
    category: 'news',
    tag: 'TECNOLOGÍA DEL MOTOR',
    headline: 'Baterías de estado sólido superan los 1.000 km de autonomía en pruebas',
    subtext: '★ Tiempos de recarga de menos de 10 minutos para la nueva generación ★',
    icon: '⚡',
    colorScheme: 'emerald',
  },
  {
    id: 'news-music-1',
    category: 'news',
    tag: 'ACTUALIDAD MUSICAL',
    headline: 'El audio espacial en cabina reduce el cansancio auditivo en viajes largos',
    subtext: '★ Los ingenieros acústicos optimizan la ecualización binaural en coches ★',
    icon: '🎧',
    colorScheme: 'purple',
  },
  {
    id: 'news-auto-2',
    category: 'news',
    tag: 'SEGURIDAD VIAL',
    headline: 'Recuerda: la distancia de seguridad recomendada equivale a 2 segundos',
    subtext: '★ A 120 km/h el vehículo recorre más de 66 metros en ese intervalo ★',
    icon: '🛡️',
    colorScheme: 'rose',
  },
  {
    id: 'news-science-1',
    category: 'news',
    tag: 'CIENCIA HOY',
    headline: 'El campo magnético solar alcanza su pico de actividad máxima con auroras',
    subtext: '★ Incremento de fenómenos luminosos visibles en latitudes medias ★',
    icon: '🌌',
    colorScheme: 'blue',
  },
  {
    id: 'news-traffic-2',
    category: 'news',
    tag: 'MOVILIDAD SOSTENIBLE',
    headline: 'Nuevos corredores verdes reducen la congestión en las circunvalaciones',
    subtext: '★ Mejor fluidez y menos emisiones en accesos a grandes ciudades ★',
    icon: '🌱',
    colorScheme: 'emerald',
  },
  {
    id: 'news-auto-3',
    category: 'news',
    tag: 'CONSEJO DE RUTA',
    headline: 'Comprueba el dibujo de los neumáticos: mínimo legal 1,6 mm',
    subtext: '★ Clave para evacuar agua y evitar aquaplaning en lluvia repentina ★',
    icon: '⚙️',
    colorScheme: 'amber',
  },
  {
    id: 'news-music-2',
    category: 'news',
    tag: 'CULTURA & SONIDO',
    headline: 'El vinilo y el audio de alta resolución continúan su auge global',
    subtext: '★ Los oyentes priorizan la calidad de masterización sin compresión ★',
    icon: '🎵',
    colorScheme: 'purple',
  },
  {
    id: 'news-tech-1',
    category: 'news',
    tag: 'INNOVACIÓN DIGITAL',
    headline: 'Sistemas de aviso preventivo alertan de retenciones antes de que ocurran',
    subtext: '★ La interconexión vehicular anticipa frenazos en carretera ★',
    icon: '🛰️',
    colorScheme: 'cyan',
  },
];

// 2. EFEMÉRIDES, CITAS Y MENSAJES (Menor frecuencia)
export const SECONDARY_MESSAGES: BannerMessage[] = [
  {
    id: 'greeting-1',
    category: 'greeting',
    tag: 'MENSAJE CÓSMICO',
    headline: 'Te deseo un buen día',
    subtext: '★ Disfruta cada kilómetro de tu viaje ★',
    icon: '☀️',
    colorScheme: 'rose',
  },
  {
    id: 'quote-1',
    category: 'quote',
    tag: 'FRASE CÉLEBRE',
    headline: '«La música es la taquigrafía de la emoción»',
    subtext: '— León Tolstói',
    icon: '🎶',
    colorScheme: 'purple',
  },
  {
    id: 'quote-2',
    category: 'quote',
    tag: 'INSPIRACIÓN',
    headline: '«El camino es el destino: disfrútalo»',
    subtext: '— Sabiduría del viajero',
    icon: '🚗',
    colorScheme: 'cyan',
  },
  {
    id: 'anniversary-1',
    category: 'anniversary',
    tag: 'EFEMÉRIDE',
    headline: 'La sonda Voyager 1 supera los 24.000 millones de kilómetros',
    subtext: '★ El objeto humano más alejado en el espacio interestelar ★',
    icon: '🛸',
    colorScheme: 'cyan',
  },
  {
    id: 'anniversary-2',
    category: 'anniversary',
    tag: 'HISTORIA DEL MOTOR',
    headline: 'Bertha Benz realizó en 1888 el primer viaje en automóvil de 106 km',
    subtext: '★ Demostró al mundo entero el futuro del transporte ★',
    icon: '🏁',
    colorScheme: 'amber',
  },
  {
    id: 'quote-3',
    category: 'quote',
    tag: 'FILOSOFÍA',
    headline: '«Sin música, la vida sería un error»',
    subtext: '— Friedrich Nietzsche',
    icon: '🎼',
    colorScheme: 'rose',
  },
];
