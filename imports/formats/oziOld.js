/**
 * @file
 * OZI format checker and parser module for the task creator.
 */
  /**
   * @todo :
   * Worse check ever: If 2 consecutive first line letter are 'W'
   */
  var check = function(text, source) {
    var lines = text.split("\n");
    var nbW = 0;
    for (var i = 0; i < lines.length; i++) {
      var words = lines[i].split(" ");
      (words[0] == 'W') ? nbW ++ : nbW = 0;
      
      if (nbW == 2) {
        return true;
      }
    }
    return false;
  }

  var parse = function(text, filename) {
    var lines = text.split("\n");
    var words = [];
    for (var i = 0; i < lines.length; i++) {
      var index = 0;
      // Getting all words in the line.
      var word = lines[i].split(" ");
      // If the line starts with W, it's a tunrpoint line.
      if (word[0] == 'W') {
        // Getting rid of blank value generated from split.
        while (index != -1) {
          index = word.indexOf(""); 
          word.splice(index, 1);
        }

        // Name cleaning.
        var name = " ";
        // Starting from 7 index.
        var z = 7;
        // Get all next words until the end of the line.
        while (word[z] !== undefined) {
          // Reaching 0.00000e+000 end of the line. Break.
          if (word[z].indexOf('+') !== -1) {
            break;
          }
          // Join them into a single name.
          name = name + " " + word[z]; 
          z++;
        }
        name = name.substring(2);
        word.push(name);
        words.push(word);
      }
    }
    
    // Storing the turnpoints.
    var tps = [];
    for (var i = 0; i < words.length; i++) {
      var tp = {
        source: source,
        name : words[i][1],
        lat : formatLatLng(words[i][2]),
        lon : formatLatLng(words[i][3]),
        altitude : words[i][6],
        description : words[i][words[i].length - 1],
      };
      tps.push(tp);
    }

    return {
      'waypoints' : tps,
    }
  }

  function formatLatLng(coord) {
    var arrayLetter = ['N', 'n', 'E', 'e'];
    var letter = coord.charAt(0);
    if (arrayLetter.indexOf(letter) >= 0) {
      coord = parseFloat(coord.substr(1));
    }
    else {
      coord = - parseFloat(coord.substr(1));
    }
    return coord;
  }

	let name = "old OziExplorer";
  export {
    name,
    check,
    parse,
  }
