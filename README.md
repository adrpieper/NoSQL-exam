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

Rekordy: **_67663_**

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

## Agregacja

Poniższa agregacja służy do znalesienia wsyzstkich lotnisk z których można dostać się do ABB (Asaba International Airport) łączac ze sobą 2 połączenia lotnicze.

```js
db.routes.aggregate(
    [
    // Stage1 - grupowanie
    { 
    $group :
        {
        _id : {id :"$source_airport_id",name : "$source_airport"},
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
            direct_routes : 1,
            destinations : {$setUnion: "$destinations.source_airport"}
        }
   },
   // Stage5 - filtr, wyświetlanie tylko interesujących wyników
   { $match : { destinations : { $all : ["ABB"] }}}
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

## Dokumentacja
[GraphLookup](https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup)
