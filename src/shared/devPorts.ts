import type { PortEntry, ReadyPort } from './types';

export const DEV_PORTS = [
  { port: 3000, label: 'React / Next.js', recommendation: 'Frontend React, Next.js, Create React App, Remix' },
  { port: 3001, label: 'Alt React / Next.js', recommendation: 'Fallback jika port 3000 sibuk, atau API companion' },
  { port: 3002, label: 'Alt Frontend', recommendation: 'Frontend tambahan, micro-frontend, atau Storybook' },
  { port: 3003, label: 'Alt Frontend', recommendation: 'Instance frontend ke-3 atau testing server' },
  { port: 3333, label: 'AdonisJS', recommendation: 'AdonisJS framework, atau custom API server' },
  { port: 4000, label: 'GraphQL / Phoenix', recommendation: 'Apollo GraphQL Server, Elixir Phoenix, atau NestJS' },
  { port: 4200, label: 'Angular', recommendation: 'Angular CLI dev server (ng serve)' },
  { port: 4321, label: 'Astro', recommendation: 'Astro framework dev server' },
  { port: 4444, label: 'Selenium / Test', recommendation: 'Selenium WebDriver, atau custom test server' },
  { port: 5000, label: 'Flask / API', recommendation: 'Python Flask, atau ASP.NET Core (HTTP)' },
  { port: 5001, label: 'ASP.NET / API', recommendation: 'ASP.NET Core (HTTPS), atau Python API fallback' },
  { port: 5173, label: 'Vite', recommendation: 'Vite dev server (React, Vue, Svelte, SolidJS)' },
  { port: 5174, label: 'Alt Vite', recommendation: 'Fallback Vite jika port 5173 sibuk' },
  { port: 5175, label: 'Alt Vite', recommendation: 'Instance Vite ke-3 (multi-project workspace)' },
  { port: 5500, label: 'Live Server', recommendation: 'VS Code Live Server extension, static HTML preview' },
  { port: 5555, label: 'Prisma Studio', recommendation: 'Prisma Studio database GUI, atau custom dev tool' },
  { port: 6006, label: 'Storybook', recommendation: 'Storybook UI component explorer' },
  { port: 7000, label: 'Custom API', recommendation: 'Custom API / microservice, atau Hono dev server' },
  { port: 8000, label: 'Uvicorn / Django', recommendation: 'Python Uvicorn, Django runserver, atau PHP built-in' },
  { port: 8001, label: 'Alt Python Server', recommendation: 'FastAPI secondary, atau Django alternate' },
  { port: 8080, label: 'Laravel / Spring', recommendation: 'Laravel Artisan serve, Spring Boot, Tomcat, Nginx proxy' },
  { port: 8081, label: 'Alt Web Server', recommendation: 'Fallback web server, React Native Metro bundler' },
  { port: 8082, label: 'Alt Web Server', recommendation: 'Tambahan web server atau API gateway testing' },
  { port: 8443, label: 'HTTPS Dev', recommendation: 'HTTPS development server, SSL proxy testing' },
  { port: 8888, label: 'Jupyter Notebook', recommendation: 'Jupyter Notebook / JupyterLab, atau custom dev server' },
  { port: 9000, label: 'PHP-FPM / Custom', recommendation: 'PHP-FPM, SonarQube, atau custom application server' },
  { port: 9090, label: 'Prometheus / Proxy', recommendation: 'Prometheus, Cockpit, atau reverse proxy dashboard' },
  { port: 9229, label: 'Node Debugger', recommendation: 'Node.js --inspect debugger port' },
  { port: 9999, label: 'Custom Dev', recommendation: 'Custom development server atau testing sandbox' },
  { port: 10000, label: 'Webmin / Custom', recommendation: 'Webmin panel, atau custom high-port dev server' },
  { port: 3306, label: 'MySQL', recommendation: 'MySQL / MariaDB database server' },
  { port: 5432, label: 'PostgreSQL', recommendation: 'PostgreSQL database server' },
  { port: 6379, label: 'Redis', recommendation: 'Redis in-memory data store / cache' },
  { port: 27017, label: 'MongoDB', recommendation: 'MongoDB NoSQL database server' },
  { port: 5672, label: 'RabbitMQ', recommendation: 'RabbitMQ message broker (AMQP)' },
  { port: 15672, label: 'RabbitMQ UI', recommendation: 'RabbitMQ Management web dashboard' },
  { port: 9200, label: 'Elasticsearch', recommendation: 'Elasticsearch search engine REST API' },
  { port: 8983, label: 'Apache Solr', recommendation: 'Apache Solr search platform' },
  { port: 2181, label: 'Zookeeper', recommendation: 'Apache Zookeeper coordination service' },
  { port: 9092, label: 'Kafka', recommendation: 'Apache Kafka message broker' },
  { port: 11211, label: 'Memcached', recommendation: 'Memcached distributed caching' },
  { port: 1433, label: 'SQL Server', recommendation: 'Microsoft SQL Server database' },
  { port: 1521, label: 'Oracle DB', recommendation: 'Oracle Database listener' },
  { port: 8086, label: 'InfluxDB', recommendation: 'InfluxDB time-series database' },
  { port: 9042, label: 'Cassandra', recommendation: 'Apache Cassandra CQL native transport' },
  { port: 7474, label: 'Neo4j', recommendation: 'Neo4j graph database browser' },
  { port: 26257, label: 'CockroachDB', recommendation: 'CockroachDB distributed SQL' },
  { port: 2375, label: 'Docker API', recommendation: 'Docker Engine REST API (unencrypted)' },
  { port: 2376, label: 'Docker TLS', recommendation: 'Docker Engine REST API (TLS encrypted)' },
  { port: 24678, label: 'Vite HMR', recommendation: 'Vite Hot Module Replacement WebSocket' }
] as const;

export const DEV_PORT_SET = new Set<number>(DEV_PORTS.map((item) => item.port));

export function getNearestAlternatives(port: number, activePorts: Set<number>, count = 3): number[] {
  const alternatives: number[] = [];
  let candidate = port + 1;

  while (alternatives.length < count && candidate <= port + 30) {
    if (!activePorts.has(candidate)) {
      alternatives.push(candidate);
    }
    candidate += 1;
  }

  return alternatives;
}

export function buildReadyPorts(entries: PortEntry[]): ReadyPort[] {
  const activePorts = new Set(entries.map((entry) => entry.localPort));
  const firstEntryByPort = new Map<number, PortEntry>();

  for (const entry of entries) {
    if (!firstEntryByPort.has(entry.localPort)) {
      firstEntryByPort.set(entry.localPort, entry);
    }
  }

  return DEV_PORTS.map((devPort) => {
    const activeEntry = firstEntryByPort.get(devPort.port);
    return {
      ...devPort,
      isActive: activePorts.has(devPort.port),
      activeEntry,
      alternatives: activePorts.has(devPort.port)
        ? getNearestAlternatives(devPort.port, activePorts)
        : []
    };
  });
}