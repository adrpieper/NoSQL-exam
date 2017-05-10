# Projekt na egzamin

## Dane
Źródło: **_[OpenFlights](http://openflights.org/data.html)_**, 

### Routes

**_[Pobierz](https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat)_**

Plik: **_routes.dat_**

Rekordy: **_67663_**

Początek pliku.

```
2B,410,AER,2965,KZN,2990,,0,CR2
2B,410,ASF,2966,KZN,2990,,0,CR2
2B,410,ASF,2966,MRV,2962,,0,CR2
2B,410,CEK,2968,KZN,2990,,0,CR2
2B,410,CEK,2968,OVB,4078,,0,CR2
```

Przykładowy dokument po imporcie.

```js
{
	"_id" : ObjectId("58f740c71d993709c60c4910"),
	"airline" : "2B",
	"airline_id" : 410,
	"source_airport" : "AER",
	"source_airport_id" : 2965,
	"dest_airport" : "KZN",
	"dest_airport_id" : 2990,
	"codeshare" : "",
	"stops" : 0,
	"equipment" : "CR2"
}
```

#### Pola

- airline - Kod linii lotniczej
- airline_id - Id linii lotniczej
- source_airport - Kod lotniska startowego
- source_airport_id - Id lotniska startowego
- dest_airport - Kod lotniska docelowego
- dest_airport_id - Id lotniska docelowego
- codeshare - Czy obslugiwane przez linię lotniczą
- stops - Liczba przesiadek
- equipment - Typ(y) samolotów

#### Import

Dane nie zawierają nazw pól, dlatego trzeba je dodać przy imporcie.

```
mongoimport -d airport -c routes --type csv --file routes.dat --fields "airline,airline_id,source_airport,source_airport_id,dest_airport,dest_airport_id,codeshare,stops,equipment"
```

### Airports

**_[Pobierz](https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat)_**

Plik: **_airports.dat_**

Rekordy: **_7184_**

Początek pliku.

```
1,"Goroka Airport","Goroka","Papua New Guinea","GKA","AYGA",-6.081689834590001,145.391998291,5282,10,"U","Pacific/Port_Moresby","airport","OurAirports"
2,"Madang Airport","Madang","Papua New Guinea","MAG","AYMD",-5.20707988739,145.789001465,20,10,"U","Pacific/Port_Moresby","airport","OurAirports"
3,"Mount Hagen Kagamuga Airport","Mount Hagen","Papua New Guinea","HGU","AYMH",-5.826789855957031,144.29600524902344,5388,10,"U","Pacific/Port_Moresby","airport","OurAirports"
4,"Nadzab Airport","Nadzab","Papua New Guinea","LAE","AYNZ",-6.569803,146.725977,239,10,"U","Pacific/Port_Moresby","airport","OurAirports"
```

Przykładowy dokument po imporcie.

```js
{
	"_id" : 1,
	"name" : "Goroka Airport",
	"city" : "Goroka",
	"country" : "Papua New Guinea",
	"iata" : "GKA",
	"icoa" : "AYGA",
	"latitude" : -6.081689834590001,
	"longitude" : 145.391998291,
	"altitude" : 5282,
	"timezone" : 10,
	"DST" : "U",
	"time_zone" : "Pacific/Port_Moresby",
	"type" : "airport",
	"source" : "OurAirports"
}

```

#### Pola

- _id - Unikalny identyfikator OperFlights.org
- name - Nazwa lotniska
- city -  Miejscowość
- country - Państwo
- iata -  3-literowy kod IAT,
- icoa -  4-literowy kod ICAO,
- latitude - szerokość geograficzna,
- longitude -  długość geograficzna,
- altitude -  wysokość w stopach,
- timezone -  strefa czasowa,
- DST - przesunięcie czasowe, jedno z E (Europa), A (US/Kanada), S (Ameryka Południowa), O (Australia), Z (Nowa zelandia), N (Brak) or U (Nieznany)
- time_zone -   strefa czasowa,
- type -  typ stacji, plik _airports.dat_ zawiera jedynie wiersze z wartościami "airport"
- source -  źródło danych, plik _airports.dat_ zawiera jedynie wiersze z wartościami "OurAirports"

#### Import

Dane nie zawierają nazw pól, dlatego trzeba je dodać przy imporcie. Niektóre wiersze zawierały znaki cudzysłowu w nazwach lotnisk. Należy je usunąć przed importem.

```
mongoimport -d airport -c airports --type csv --file airports.dat --fields "_id,name,city,country,iata,icoa,latitude,longitude,altitude,timezone,DST,time_zone,type,source"
```

## Index

Aby przyśpieszyć działanie agregacji dodaję index do pola "source_airport_id" użytego jak klucza w "$graphLookup".

```
db.routes.createIndex({ "source_airport_id" : 1});
```
Aby porównać szybkość działadania agregacji z i bez i indexu, uruchomiłem ją 10 razy w każdym z wariantów i wyciągnąłem średnią:

_bez indexu_ : 26619 ms, 25952 ms
_z indexem_ : 14707 ms

Dodanie indexu przyśpieszyło działanie agregacji przewie dwuktrotnie.


## Agregacja

Poniższa agregacja służy do znalesienia wsyzstkich lotnisk z których można dostać się do ABB (Asaba International Airport) łączac ze sobą 2 połączenia lotnicze.

```js
db.routes.aggregate(
    [
    // Stage1 - grupowanie
    { 
    $group :
        {
        _id : {airport_id :"$source_airport_id",name : "$source_airport"},
        direct_routes_ids : { $push : "$dest_airport_id" },
        direct_routes : { $push : "$dest_airport" }
        }
    },
    // Stage2 - przeszukanie grafu połączeń
    {
          $graphLookup: {
             from: "routes",
             startWith: "$direct_routes_ids",
             connectFromField: "dest_airport_id",
             connectToField: "source_airport_id",
             maxDepth: 1,
             as: "destinations"
          }
   },
   // Stage4 - usunięcie powtórzeń, wyświetlanie danych
   {
        $project :
        {
            destinations : {$setUnion: "$destinations.source_airport"}
        }
   },
   // Stage5 - filtr, wyświetlanie tylko interesujących wyników
   { $match : { destinations : { $all : ["ABB"] }}},
   // Stage6 - dołączam dane o lotniskach
   {
      $lookup:
        {
          from: "airports",
          localField: "_id.airport_id",
          foreignField: "_id",
          as: "airport_data"
        }
   },
   // Stage7 - wyświetlam dane w przejrzysty sposób
   {
        $project :
        {
            _id : 0,
            airport : "$_id.name",
            airport_name : "$airport_data.name"
        }
   }
   ]
);

```

### Stage1 - grupowanie

Grupuje ze sobą loty, które dotycza tego samego lotniska. W ten sposób uzyskuje listę lotów bezpośrednich dla każdego lotniska w zbiorze.

### Stage2 - przesukanie grafu

Przeszukuje graf połączeń lotniczych. Dla każdego lotniska uzyskuje listę połączeń "destinations" pośrednich (z jedną przesiadką).

### Stage4 - usunięcie powtórzeń, wyświetlanie danych

Przygotowuje dane do wyświetlenia. Usuwam powtarzające się lotnika docelowe.

### Stage5 - filtr, wyświetlanie tylko interesujących wyników

Zostawiam tylko lotniska, z których można dostać się do ABB (Asaba International Airport).

### Stage6 - dołączam dane o lotniskach

Dołączam nazwy dotnisk odpowiadające numerom id. Nazwy będą dostępne w nowym polu airport_data.

### Stage7 - wyświetlam dane w przejrzysty sposób

Wyświetlam listę lotnik w postaci symbolu i nazwy.

## Wynik
Wynik zawiera listę lotnisk z których można dostać się do ABB (Asaba International Airport). Lotniska, których nazwy nie znajdują się w bazie airport, mają pustę pole "airport_name".

Poniżej zamieściłem kilka rekordów z wyniku.

```
{ "airport" : "TGI", "airport_name" : [ "Tingo Maria Airport" ] }
{ "airport" : "ATA", "airport_name" : [ "Comandante FAP German Arias Graziani Airport" ] }
{ "airport" : "ANS", "airport_name" : [ "Andahuaylas Airport" ] }
{ "airport" : "SKO", "airport_name" : [ "Sadiq Abubakar III International Airport" ] }
{ "airport" : "QRW", "airport_name" : [ ] }
```

## Dokumentacja
[GraphLookup](https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup)
[Lookup](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup)

