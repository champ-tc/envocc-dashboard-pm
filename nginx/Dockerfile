FROM nginx:stable-alpine

RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY validate-tls.sh /docker-entrypoint.d/05-validate-tls.sh

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
