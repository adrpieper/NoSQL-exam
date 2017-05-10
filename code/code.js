db.routes.createIndex({ "source_airport_id" : 1});
db.routes.aggregate(
    [
    { $match : { stops : 0 }},
    {
    $group :
        {
        _id : {airport_id :"$source_airport_id", name : "$source_airport"},
        direct_routes_ids : { $addToSet : "$dest_airport_id" },
        direct_routes : { $addToSet : "$dest_airport" }
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
            destinations : {$setUnion: "$destinations.source_airport"}
        }
   },
   { $match : { destinations : { $all : ["ABB"] }}},
   {
      $lookup:
        {
          from: "airports",
          localField: "_id.airport_id",
          foreignField: "_id",
          as: "airport_data"
        }
   },
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
