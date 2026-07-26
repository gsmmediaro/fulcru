# Minimal image for the Fulcru CLI + local MCP server. No secrets baked in;
# pass FULCRU_TOKEN at run time:
#   docker run --rm -e FULCRU_TOKEN=pk_... fulcru gaps
FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY bin ./bin
COPY mcp ./mcp
COPY skills ./skills
COPY README.md LICENSE ./

# Global install exposes both `fulcru` and `fulcru-mcp` on PATH.
RUN npm install -g .

ENTRYPOINT ["fulcru"]
CMD ["--help"]
