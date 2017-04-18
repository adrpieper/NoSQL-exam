# Projekt na egzamin
## Dane

### Zbiór danych

Nazwa: **Routes**

Źródło: **_[Pobierz](https://link)_**

Plik: **_Routes.csv_**

Rekordy: **_?_**

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
    // Stage2 - przesukanie grafu
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

### Wynik
