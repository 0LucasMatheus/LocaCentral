FROM node:20-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /usr/app

COPY package.json .
COPY .yarnrc.yml .
COPY yarn.lock .
COPY .yarn/plugins .yarn/plugins
COPY .yarn/releases .yarn/releases
COPY webapps/commonui/package.json webapps/commonui/package.json
COPY webapps/landlord/package.json webapps/landlord/package.json

RUN yarn workspaces focus @microrealestate/landlord

COPY webapps/landlord/next.config.js webapps/landlord/next.config.js
COPY webapps/landlord/i18n.js webapps/landlord/i18n.js
COPY webapps/landlord/tailwind.config.js webapps/landlord/tailwind.config.js
COPY webapps/landlord/postcss.config.js webapps/landlord/postcss.config.js
COPY webapps/landlord/tsconfig.json webapps/landlord/tsconfig.json
COPY webapps/landlord/components.json webapps/landlord/components.json
COPY webapps/commonui webapps/commonui

CMD node webapps/commonui/scripts/generateruntimeenvfile.js -- --path ./webapps/landlord && \
    yarn workspace @microrealestate/landlord run dev -p $PORT
