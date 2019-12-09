FROM microsoft/mssql-server-linux:2017-latest
ENV ACCEPT_EULA=Y
ENV MSSQL_PID=Developer
ENV SA_USERNAME=TEST
ENV SA_PASSWORD=TEST
ENV PATH="/opt/mssql/bin/:/opt/mssql-tools/bin/:${PATH}"
COPY *.sql /
RUN sqlservr --accept-eula & sleep 10 \
    && sqlcmd -S localhost -U SA -P $SA_PASSWORD -q "ALTER LOGIN [sa] WITH NAME = [$SA_USERNAME]" \
    && sqlcmd -S localhost -U $SA_USERNAME -P $SA_PASSWORD -i /db_setup.sql \
    && pkill sqlservr 
