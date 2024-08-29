FROM node:22.5.1-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x /app/wait-for-it.sh

EXPOSE 3000

CMD ["./wait-for-it.sh", "db:5432", "--", "sh", "-c", "npx prisma generate && npx prisma migrate dev --name init && npm run dev"