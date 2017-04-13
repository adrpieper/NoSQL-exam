db.routes.aggregate(
    [
    { $match : { stops : 0 }},
    {
    $group :
        {
        _id : {id :"$source_airport_id",name : "$source_airport"},
        direct_routes_ids : { $push : "$dest_airport_id" },
        direct_routes : { $push : "$dest_airport" }
        }
    },
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
   {
        $project :
        {
            direct_routes : 1,
            destinations : {$setUnion: "$destinations.source_airport"}
        }
   },
   { $match : { destinations : { $all : ["ABB"] }}}
   ]
);
