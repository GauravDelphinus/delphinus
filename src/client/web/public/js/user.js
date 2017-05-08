    $(document).ready(function(){
      	createLoginHeader();

        // NOTE:
        // userInfo - whose page we're looking at
        // user - currently logged in user

        console.log("user is " + JSON.stringify(user));
        console.log("userInfo is " + JSON.stringify(userInfo));

        var profileType = "public";
        if (!user) {
          profileType = "public"; // public profile, not logged in
        } else if (user) {
          if (user.id == userInfo.id) {
            profileType = "mine";  // I'm logged in, and it's my own profile
          } else {
            profileType = "member"; // I'm logged in, and it's another member's profile
          }
        }
      	if (userInfo) {

          // Profile Image and Name
          setupCarousel(userInfo, profileType);


          if (userInfo.displayName) {
            $("#displayName").text(userInfo.displayName);
          }

          // Followers Section
          //testing
          userInfo.numFollowers = 122;
          if (userInfo.numFollowers) {
            $("#numFollowers").text(userInfo.numFollowers);
          }

          $("#followLink").text("FOLLOW " + userInfo.displayName).attr("href", "/user/" + userInfo.id + "/follow");

          // Social Section
          if (profileType == "public" || profileType == "member") {
            $("#socialHeader").text("Connect with " + userInfo.displayName);
          } else if (profileType == "mine") {
            $("#socialHeader").text("Manage your Social Networks");
          }

          console.log("userInfo is " + JSON.stringify(userInfo));

          console.log("userInfo.google is " + userInfo.google);
          console.log("userInfo.twitter is " + userInfo.twitter);
          console.log("userInfo.facebook is " + userInfo.facebook);

          var googleIsConnected = userInfo.hasOwnProperty("google") ? userInfo.google.hasOwnProperty("id") : false;
          var googleProfileLink = (googleIsConnected) ? "https://plus.google.com/" + userInfo.google.id : "/auth/google";
          var twitterIsConnected = userInfo.hasOwnProperty("twitter") ? userInfo.twitter.hasOwnProperty("username") : false;
          var twitterProfileLink = (twitterIsConnected) ? "https://twitter.com/" + userInfo.twitter.username : "/auth/twitter";
          var facebookIsConnected = userInfo.hasOwnProperty("facebook") ? userInfo.facebook.hasOwnProperty("id") : false;
          var facebookProfileLink = (facebookIsConnected) ? "https://www.facebook.com/" + userInfo.facebook.id : "/auth/facebook";

          updateSocialStatus(profileType, googleIsConnected, "#linkGoogle", "#imageGoogle", "#imageGoogleTick", googleProfileLink, "/auth/google", "/images/social/google_regular_300x300.png", "/images/social/google_disabled_300x300.png");
          updateSocialStatus(profileType, twitterIsConnected, "#linkTwitter", "#imageTwitter", "#imageTwitterTick", twitterProfileLink, "/auth/twitter", "/images/social/twitter_regular_300x300.png", "/images/social/twitter_disabled_300x300.png");
          updateSocialStatus(profileType, facebookIsConnected, "#linkFacebook", "#imageFacebook", "#imageFacebookTick", facebookProfileLink, "/auth/facebook", "/images/social/facebook_regular_300x300.png", "/images/social/facebook_disabled_300x300.png");

          
         		if (userInfo.id) {
              $("#profileInfo").append($("<p>", {text: "ID: " + userInfo.id, class: "userInfoText"}));
            }

            if (userInfo.email) {
              $("#profileInfo").append($("<p>", {text: "Email: " + userInfo.email, class: "userInfoText"}));
            }

          //get challenges posted by this user
          $.getJSON('/api/challenges/?user=' + userInfo.id, extractChallenges);

          //get entries posted by this user
          $.getJSON('/api/entries/?user=' + userInfo.id, extractEntries);

      	}

          // Setup the dnd listeners.
  var dropZone = document.getElementById('dropzone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileDropped, false);

  $("#browseImage").on("change", handleFileSelect);
    });

    function setupCarousel(userInfo, profileType) {

      $("#profileImage").attr("src", userInfo.image);
      $("#changePicture").click(function() {
        $("#changePicture").hide();
        
        $("#profileImage").hide();
        $("#setImage").show();
        $("#newImage").show();


          $("#imageCarousel").show();
     
          var alreadyAddedImages = [];

          if (userInfo.image) {
            appendProfileImageToCarousel(userInfo.image, true);
            alreadyAddedImages.push(userInfo.image);
          }

          if (userInfo.hasOwnProperty("facebook")) {
            console.log("userInfo.facebook.image is " + userInfo.facebook.image);
            console.log("length = " + alreadyAddedImages.length + ", array is " + alreadyAddedImages);
            if (userInfo.facebook.image && ($.inArray(userInfo.facebook.image, alreadyAddedImages) == -1)) {
              console.log("calling append for facebook");
              appendProfileImageToCarousel(userInfo.facebook.image);
              alreadyAddedImages.push(userInfo.facebook.image);
            }
          }
          
          if (userInfo.hasOwnProperty("google")) {
            console.log("num Google Images = " + userInfo.google.images.length);
            if (userInfo.google.images && userInfo.google.images.length > 0) {
              for (var i = 0; i < userInfo.google.images.length; i++) {
                if ($.inArray(userInfo.google.images[i], alreadyAddedImages) == -1) {
                  console.log("calling append for google");
                appendProfileImageToCarousel(userInfo.google.images[i]);
                alreadyAddedImages.push(userInfo.google.images[i]);
              }
         
              }
            }
          }

          if (userInfo.hasOwnProperty("twitter")) {
            console.log("num Twitter Images = " + userInfo.twitter.images.length);
            if (userInfo.twitter.images && userInfo.twitter.images.length > 0) {
              for (var i = 0; i < userInfo.twitter.images.length; i++) {
                if ($.inArray(userInfo.twitter.images[i], alreadyAddedImages) == -1) {
                  console.log("calling append for twitter");
                appendProfileImageToCarousel(userInfo.twitter.images[i]);
                alreadyAddedImages.push(userInfo.twitter.images[i]);
              }
                
              }
            }
          }

          //$("#imageCarousel").find(".item").first().addClass("active");

          //make sure to make the first item active
          $("#imageCarousel").carousel(0);

          });
      
    $("#saveImage").click(function() {
      //var selectedIndex = $('div.active').index() + 1;
      //console.log("selectedIndex is " + selectedIndex);
      //var selectedImageSrc = $("#imageCarousel .item.active img").prop("src");
      //console.log("selected src = " + selectedImageSrc);

      var selectedImageSrc = $("#profileImage").prop("src");

      if (selectedImageSrc.substring(0, 4) == "data") {
        //data url
        //upload the image, get a url in response, and set that as the profile link


        var jsonObj = {};
        jsonObj.user = {};
        jsonObj.user.id = userInfo.id;
        jsonObj.user.image = selectedImageSrc;

        $.ajax({
          type: "PUT",
          url: "/api/users/",
          dataType: "json", // return data type
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify(jsonObj)
        })
        .done(function(data, textStatus, jqXHR) {
          //alert("successful, image is " + data.image);
          userInfo.image = data.image;

          $("#imageCarousel .item.active img").prop("src", data.image);
          $("#profileImage").prop("src", data.image);

          //clean up the carousel of children
          $(".carousel .item").remove();
          $(".carousel-indicators li").remove();
          $("#imageCarousel").removeData();
          $("#imageCarousel").hide();
          $("#profileImage").show();
          $("#newImage").hide();
          $("#saveImage").hide();
          $("#changePicture").show();
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          alert("some error was found, " + errorThrown);
          
        });
      } else if (selectedImageSrc.substring(0, 4) == "http") {
        //web url
        userInfo.image = selectedImageSrc;
      }

    });

    $("#setImage").click(function() {
      var selectedImage = $("#imageCarousel .item.active img").prop("src");


      var jsonObj = {};
        jsonObj.user = {};
        jsonObj.user.id = userInfo.id;
        jsonObj.user.image = selectedImage;

        $.ajax({
          type: "PUT",
          url: "/api/users/",
          dataType: "json", // return data type
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify(jsonObj)
        })
        .done(function(data, textStatus, jqXHR) {
          //alert("successful, image is " + data.image);
          userInfo.image = data.image;

          $("#profileImage").prop("src", data.image);

          //clean up the carousel of children
          $(".carousel .item").remove();
          $(".carousel-indicators li").remove();
          $("#imageCarousel").removeData();
          $("#imageCarousel").hide();
          $("#profileImage").show();
          $("#newImage").hide();
          $("#setImage").hide();
          $("#changePicture").show();
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          alert("some error was found, " + errorThrown);
          
        });
    });

    $("#newImage").click(function() {
      $("#imageCarousel").hide();
      $("#dropzone").show();
      $("#browseImage").show();
      $("#newImage").hide();
      $("#saveImage").hide();
      $("#setImage").hide();
    });
          

    }

    function appendProfileImageToCarousel(imageUrl, active, append /* false if prepend */) {
      this.carouselSlideIndex = 0;

      $div = $("<div>", {class: "item" + (active ? " active" : "")}).appendTo($(".carousel-inner"));
      $div.append($("<img>", { class: "img-responsive profileImage img-rounded", src: imageUrl , height: "200px"}));

      $ci = $(".carousel-indicators");
      
      $li = $("<li>", {"data-target" : "#imageCarousel", "data-slide-to" : this.carouselSlideIndex, class : (active ? " active" : "")});
      if (append) {
        $li.appendTo($ci);
      } else {
        $li.prependTo($ci);
      }
      
      this.carouselSlideIndex++;
    }

    function updateSocialStatus(profileType, isConnected, linkID, imageID, imageTickID, profilePath, authPath, regularIconPath, disabledIconPath) {
      
        //console.log("updateSocialStatus: profileType : " + profileType + ", isConnected = " + isConnected + ", profilePath = " + profilePath + ", authPath = " + authPath);
          if (isConnected) {
            if (profileType == "public") {
              $(linkID).attr("href", profilePath);
              $(imageID).attr("src", regularIconPath);
              $(imageID).show();
              $(imageTickID).hide();
            } else if (profileType == "member") {
              $(linkID).attr("href", profilePath);
              $(imageID).attr("src", regularIconPath);
              $(imageID).show();
              if (false) { // if user and userInfo are connected on Google
                $(imageTickID).show();
              } else {
                $(imageTickID).hide();
              }
            } else if (profileType == "mine") {
              $(linkID).attr("href", profilePath);
              $(imageID).attr("src", regularIconPath);
              $(imageID).show();
              $(imageTickID).show();
            }
          } else {
            if (profileType == "mine") {
              //show a grayed icon, with a link to connect
              $(linkID).attr("href", authPath);
              $(imageID).attr("src", disabledIconPath);
              $(imageTickID).hide();
            } else {
              $(imageID).hide();
              $(imageTickID).hide();
            }
          }
    }

    function extractChallenges(challenges) {
      var numCols = 5; // max columns

      $("#challengesTable").empty();

      for (var i = 0; i < challenges.length; i++) {
        var col = i % numCols;
        //var row = i / numCols;

        var challenge = challenges[i];

        var td = $("<td>").append($("<img>").attr("src", "/challenges/images/" + challenge._id).attr("width", "100"));
        td.append($("<br>"));
        td.append($("<a>").attr("href", "/challenge/" + challenge._id).text(challenge.title));
        
        if (col == 0) {
          $("#challengesTable").append("<tr>").append(td);
        } else {
          $("#challengesTable").append(td);
        }

      }
    }

    function extractEntries(entries) {
      var numCols = 5; // max columns

      $("#entriesTable").empty();

      for (var i = 0; i < entries.length; i++) {
        var col = i % numCols;
        //var row = i / numCols;

        var entry = entries[i];

        var td = $("<td>").append($("<img>").attr("src", "/entries/images/" + entry._id).attr("width", "100"));
        td.append($("<br>"));
        td.append($("<a>").attr("href", "/entry/" + entry._id).text("Entry " + entry._id));
        
        if (col == 0) {
          $("#entriesTable").append("<tr>").append(td);
        } else {
          $("#entriesTable").append(td);
        }

      }
    }

function handleFileDropped(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  extractImage(evt.dataTransfer.files, handleFileSelected);
}

function handleFileSelected(data, path, title) {
  console.log("file selected, path = " + path + ", title = " + title);
  //$("#imageCarousel").show();
  //appendProfileImageToCarousel(data, false);
  //var totalItems = $('.carousel .item').length;
  //console.log("totalItems is " + totalItems);

  // the item appended above must be the last item, make that active
  //$("#imageCarousel").carousel(totalItems - 1);

  //console.log("switched carousel to item index: " + (totalItems - 1));
  
  $("#profileImage").prop("src", data);
  $("#profileImage").show();
      $("#dropzone").hide();
      $("#browseImage").hide();
      $("#newImage").show();
      $("#saveImage").show();
      $("#setImage").hide();
}

function handleFileSelect(evt) {
    extractImage(evt.target.files, handleFileSelected); // FileList object
}


  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }