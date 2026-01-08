using Microsoft.Extensions.Logging;

namespace Puzzles.Services;

/// <summary>
/// Service for validating Danish words using a curated word list.
/// </summary>
public class DanishWordService : IDanishWordService
{
    private readonly ILogger<DanishWordService> _logger;
    private readonly HashSet<string> _validWords;
    private readonly List<string> _easyWords;
    private readonly List<string> _mediumWords;
    private readonly List<string> _hardWords;
    private static readonly Random Random = new();

    public int WordCount => _validWords.Count;

    public DanishWordService(ILogger<DanishWordService> logger)
    {
        _logger = logger;
        _validWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Initialize word lists
        InitializeWordList();

        // Categorize words by difficulty based on length
        _easyWords = _validWords.Where(w => w.Length >= 3 && w.Length <= 5).ToList();
        _mediumWords = _validWords.Where(w => w.Length >= 4 && w.Length <= 7).ToList();
        _hardWords = _validWords.Where(w => w.Length >= 6 && w.Length <= 10).ToList();

        _logger.LogInformation("Danish word service initialized with {Count} words (Easy: {Easy}, Medium: {Medium}, Hard: {Hard})",
            _validWords.Count, _easyWords.Count, _mediumWords.Count, _hardWords.Count);
    }

    public bool IsValidWord(string word)
    {
        if (string.IsNullOrWhiteSpace(word))
            return false;

        return _validWords.Contains(word.Trim().ToUpper());
    }

    public List<string> FilterValidWords(IEnumerable<string> words)
    {
        return words
            .Where(w => !string.IsNullOrWhiteSpace(w))
            .Select(w => w.Trim().ToUpper())
            .Where(w => _validWords.Contains(w))
            .ToList();
    }

    public List<string> GetRandomWords(int count, string difficulty)
    {
        var wordList = difficulty?.ToLower() switch
        {
            "easy" => _easyWords,
            "medium" => _mediumWords,
            "hard" => _hardWords,
            _ => _mediumWords
        };

        if (wordList.Count < count)
        {
            _logger.LogWarning("Not enough words for difficulty {Difficulty}, requested {Count} but only have {Available}",
                difficulty, count, wordList.Count);
            count = wordList.Count;
        }

        // Fisher-Yates shuffle to get random selection
        var shuffled = wordList.OrderBy(_ => Random.Next()).Take(count).ToList();
        return shuffled;
    }

    private void InitializeWordList()
    {
        // Comprehensive list of valid Danish words suitable for word search
        // Organized by category for maintainability

        // === ANIMALS (DYR) ===
        AddWords(new[]
        {
            // Common animals
            "HUND", "KAT", "FUGL", "FISK", "HEST", "KO", "GRIS", "FÅR", "GED", "HØNE",
            "HANE", "AND", "GÅS", "ØRNE", "UGLE", "RAVN", "KRAGE", "DUE", "SVANE", "STORK",
            "RÆVE", "ULV", "BJØRN", "HARE", "KANIN", "MUS", "ROTTE", "EGERN", "PINDSVIN", "MULDVARP",
            "FRØER", "TUDSE", "SLANGE", "FIRBEN", "SKILDPADDE", "KROKODILLE",

            // Sea animals
            "HAJER", "HVALER", "DELFIN", "SÆL", "HVALROS", "BLÆKSPRUTTE", "KRABBE", "HUMMER",
            "REJE", "MUSLING", "SØSTJERNE", "VANDMAND", "LAKS", "TORSK", "MAKREL", "SILD", "ÅL",

            // Exotic animals
            "LØVE", "TIGER", "ELEFANT", "GIRAF", "ZEBRA", "NÆSEHORN", "FLODHEST", "GORILLA",
            "CHIMPANSE", "ORANGUTANG", "PANDA", "KOALA", "KÆNGURU", "PINGVIN", "PAPEGØJE",
            "FLAMINGO", "PELIKAN", "STRUDS", "EMU", "GEPARD", "LEOPARD", "JAGUAR", "PUMA",
            "KAMEL", "DROMEDAR", "LAMA", "ALPAKA", "BISON", "ANTILOPE", "GAZELLE",
            "TAPIR", "OKAPI", "LEMUR", "MAKI", "VASKEBJØRN", "GRÆVLING", "ODDER",
            "BÆVER", "MOSKUSOKSE", "RENSDYR", "ELGE", "HJORT", "DÅDYR", "VILDSVIN",

            // Insects and small creatures
            "BI", "HVEPS", "HUMLE", "FLUE", "MYG", "SOMMERFUGL", "MØLLE", "BILLE",
            "MARIEHØNE", "GRÆSHOPPE", "MYRE", "TERMIT", "EDDERKOP", "SKORPION",
            "TUSINDBEN", "SNEGLE", "REGNORM", "IGLE",

            // Birds
            "SPURV", "MEJSE", "FINKE", "SOLSORT", "DROSSEL", "NATTERGAL", "LÆRKE",
            "VIBE", "STÆR", "SKOVSKADE", "SPÆTTE", "GØGE", "FASAN", "AGERHØNE",
            "URFUGL", "TJUR", "TRANE", "HEJRE", "FISKEHEJRE", "RØRHØNE",
            "BLISHØNE", "LAPPEDYKKER", "SKARV", "ALKEFUGL", "MÅGE", "TERNE",
            "SKADE", "ALLIKE", "DOMPAP", "STILLITS", "GRØNIRISK", "BOGFINKE",
            "KVÆKERFINKE", "KERNEBIDER", "RØDHALS", "GÆRDESMUTTE", "MUSVIT",
            "BLÅMEJSE", "SORTMEJSE", "SPÆTMEJSE", "TRÆLØBER", "TORNSKADE",
            "ISFUGL", "BIÆDER", "HÆRFUGL", "VENDEHALS", "FLUESNAPPER",
            "GULBUG", "RØRSANGER", "LØVSANGER", "GRANSANGER", "MUNK",
            "HAVESANGER", "TORNSANGER", "BYNKEFUGL", "BROGET", "STENPIKKER",
            "SJAGGER", "VINDROSSEL", "RINGDROSSEL", "MISTELDROSSEL"
        });

        // === FOOD (MAD) ===
        AddWords(new[]
        {
            // Fruits
            "ÆBLE", "PÆRE", "BANAN", "APPELSIN", "CITRON", "LIME", "GRAPE", "MELON",
            "VANDMELON", "JORDBÆR", "HINDBÆR", "BLÅBÆR", "BROMBÆR", "SOLBÆR", "RIBS",
            "STIKKELSBÆR", "KIRSEBÆR", "BLOMME", "FERSKEN", "ABRIKOS", "NEKTARIN",
            "MANGO", "PAPAYA", "ANANAS", "KIWI", "FIGEN", "DADEL", "GRANATÆBLE",
            "DRUE", "ROSIN", "SVESKER", "KOKOS", "AVOCADO",

            // Vegetables
            "KARTOFFEL", "KARTOFLER", "GUL", "GULEROD", "GULERØDDER", "TOMAT", "TOMATER",
            "AGURK", "PEBERFRUGT", "SQUASH", "AUBERGINE", "BROCCOLI", "BLOMKÅL",
            "GRØNKÅL", "HVIDKÅL", "RØDKÅL", "SPIDSKÅL", "ROSENKÅL", "SPINAT",
            "SALAT", "RUCOLA", "PERSILLE", "DILD", "PURLØG", "LØGE", "HVIDLØGE",
            "PORRE", "SELLERI", "PASTINAK", "PERSILLEROD", "RØDBEDE", "MAJROE",
            "RADISE", "ÆRTER", "BØNNER", "LINSER", "KIKÆRTER", "MAJS", "RIS",
            "ASPARGES", "ARTISKOK", "FENNIKEL", "INGEFÆR", "GURKEMEJE",

            // Bread and baked goods
            "BRØD", "RUGBRØD", "FRANSKBRØD", "BOLLE", "RUNDSTYKKE", "CROISSANT",
            "WIENERBRØD", "KANELSNEGL", "KRINGLE", "KAGE", "LAGKAGE", "CHOKOLADEKAGE",
            "GULERODSKAGE", "ÆBLEKAGE", "PANDEKAGE", "VAFFEL", "KIKS", "SMÅKAGE",
            "COOKIE", "BROWNIE", "MUFFIN", "CUPCAKE", "TÆRTE", "PAI",

            // Dairy
            "MÆLK", "FLØDE", "SMØR", "OST", "YOGHURT", "SKYR", "KEFIR",
            "CREMEFRAICHE", "MASCARPONE", "RICOTTA", "MOZZARELLA", "PARMESAN",
            "CHEDDAR", "BRIE", "CAMEMBERT", "FETA", "GORGONZOLA",

            // Meat
            "KØD", "OKSEKØD", "SVINEKØD", "LAMMEKØD", "KYLLING", "KALKUN", "AND",
            "GÅS", "FASAN", "VILDT", "HJORT", "HARE", "BACON", "SKINKE", "PØLSE",
            "SALAMI", "SPEGEPØLSE", "LEVERPOSTEJ", "PATÉ", "FRIKADELLE", "BØF",
            "STEG", "KOTELET", "MEDALJON", "FILET", "TATAR",

            // Fish and seafood
            "LAKSE", "TORSKEN", "RØDSPÆTTE", "TUNFISK", "HELLEFISK", "HAVKAT",
            "HORNFISK", "KARPE", "GEDDE", "ABORRE", "SANDART", "ØRRED", "KULLER",
            "KULMULE", "SEJ", "HAVTASKE", "PIGHVAR", "SKRUBBE", "ISING",

            // Other food
            "PASTA", "NUDLER", "SPAGHETTI", "LASAGNE", "PIZZA", "BURGER", "HOTDOG",
            "SANDWICH", "TOAST", "SUPPE", "GRYDE", "SALAT", "SAUCE", "DRESSING",
            "MAYO", "KETCHUP", "SENNEP", "PEBER", "SALT", "SUKKER", "MEL",
            "ÆGER", "NØDDER", "MANDLER", "HASSELNØD", "VALNØD", "PEANUT", "CASHEW",
            "PISTACIE", "PINJEKERNE", "SOLSIKKEKERNE", "GRÆSKARKERNE",
            "CHOKOLADE", "LAKRIDS", "BOLSJE", "VINGUMMI", "KARAMEL", "MARMELADE",
            "HONNING", "SIRUP", "NUTELLA"
        });

        // === NATURE (NATUR) ===
        AddWords(new[]
        {
            // Weather
            "SOL", "MÅNE", "STJERNE", "SKY", "SKYER", "REGN", "REGNVEJR", "TORDEN",
            "LYN", "STORM", "ORKAN", "TORNADO", "TÅGE", "DUG", "FROST", "IS", "SNE",
            "SNEVEJR", "HAGLE", "SLUD", "REGNBUE", "NORDLYS", "SOLSKIN", "SOLNEDGANG",
            "SOLOPGANG", "TUSMØRKE", "DAGGRY", "SKUMRING",

            // Landscape
            "SKOV", "HAVE", "PARK", "ENG", "MARK", "AGER", "MOSE", "HEDE", "KLIT",
            "STRAND", "KYST", "HI", "HOLM", "HALVØ", "FJORD", "BUGT", "SØE", "DAM",
            "FLOD", "BÆKE", "VANDLØB", "VANDFALD", "KILDE", "BRØND", "GEJSER",
            "BJERG", "BJERGE", "BAKKE", "DAL", "KLØFT", "GROTTE", "HULE", "KLINT",
            "VULKAN", "GLETSJER", "ØRKEN", "SAVANNE", "JUNGLE", "REGNSKOV",
            "SUMP", "DELTA", "ÅDAL", "MORÆNEBAKKE",

            // Plants
            "TRÆER", "GRAN", "FYR", "EG", "BØG", "BIRKE", "ASK", "ELM", "LINDE",
            "POPPEL", "PIL", "RØNN", "AHORN", "KASTANJE", "VALNØDDE", "HASSEL",
            "TJØRNE", "SLÅEN", "HYLD", "ROSE", "LILJE", "TULIPAN", "PÅSKELILJE",
            "KROKUS", "ANEMONE", "VIOL", "PRIMULA", "BELLIS", "MÆLKEBØTTE",
            "KLØVER", "GRÆS", "TANG", "ALGE", "MOS", "LAV", "BREGNE", "LYNG",
            "GYVEL", "VALMUE", "KORNBLOMST", "KAMILLE", "SOLSIKKE", "DAHLIA",
            "GEORGINE", "ASTERS", "KRYSANTEMUM", "ORKIDÉ", "BEGONIE", "PELARGONIE",
            "FUCHSIA", "HORTENSIA", "JASMIN", "LAVENDEL", "ROSMARIN", "TIMIAN",
            "BASILIKUM", "MYNTE", "SALVIE", "OREGANO",

            // Seasons and time
            "FORÅR", "SOMMER", "EFTERÅR", "VINTER", "DAG", "NAT", "MORGEN",
            "FORMIDDAG", "MIDDAG", "EFTERMIDDAG", "AFTEN", "WEEKEND",
            "MANDAG", "TIRSDAG", "ONSDAG", "TORSDAG", "FREDAG", "LØRDAG", "SØNDAG",
            "JANUAR", "FEBRUAR", "MARTS", "APRIL", "MAJ", "JUNI", "JULI",
            "AUGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DECEMBER"
        });

        // === OBJECTS (TING) ===
        AddWords(new[]
        {
            // Household
            "HUS", "HJEM", "BOLIG", "LEJLIGHED", "VILLA", "HYTTE", "SLOT", "TÅRN",
            "KIRKE", "SKOLE", "HOSPITAL", "BIBLIOTEK", "MUSEUM", "TEATER", "BIOGRAF",
            "TAG", "VÆGE", "GULV", "LOFT", "DØR", "VINDUE", "TRAPPE", "ELEVATOR",
            "ALTAN", "TERRASSE", "VERANDA", "KÆLDER", "LOFT",
            "STOL", "BORD", "SOFA", "SENG", "SKAB", "KOMMODE", "REOL", "HYLDE",
            "LAMPE", "LYSEKRONE", "GULVTÆPPE", "GARDINER", "PUDER", "TÆPPE",
            "KØKKENE", "OVNE", "KOMFUR", "KØLESKAB", "FRYSER", "OPVASKEMASKINE",
            "VASKEMASKINE", "TØRRETUMBLER", "STØVSUGER", "BLENDER", "MIXER",
            "TOASTER", "KEDEL", "KAFFEMASKINE", "ELKEDEL", "MIKROOVN",
            "GRYDE", "PANDE", "KASSEROLLER", "SKÅL", "TALLERKEN", "KOP", "GLAS",
            "BESTIK", "KNIV", "GAFFEL", "SKE", "SERVERINGSFAD", "BAKKER",

            // Technology
            "COMPUTER", "LAPTOP", "TABLET", "MOBIL", "TELEFONE", "SMARTPHONE",
            "FJERNSYN", "RADIO", "HØJTALER", "HOVEDTELEFONER", "MIKROFON",
            "KAMERA", "VIDEOKAMERA", "PROJEKTOR", "SKÆRM", "TASTATUR",
            "MUSE", "PRINTER", "SCANNER", "ROUTER", "MODEM", "USB",
            "BATTERI", "OPLADER", "KABEL", "STIK", "ADAPTER",

            // Transport
            "BIL", "BILER", "LASTBIL", "VAREVOGN", "BUS", "RUTEBIL", "TAXA",
            "MOTORCYKEL", "SCOOTER", "KNALLERT", "CYKEL", "CYKLER", "LØBEHJUL",
            "TOG", "METRO", "SPORVOGN", "LETBANE", "FLY", "FLYVER", "HELIKOPTER",
            "SKIB", "BÅD", "FÆRGE", "YACHT", "JOLLE", "KANO", "KAJAK",
            "TRAKTOR", "GRAVKO", "KRAN", "TRUCK", "AMBULANCE", "BRANDBIL",
            "POLITIBIL", "CAMPINGVOGN", "AUTOCAMPER",

            // Sports and play
            "BOLD", "BOLDE", "FODBOLD", "HÅNDBOLD", "BASKETBALL", "VOLLEYBALL",
            "TENNIS", "BADMINTON", "SQUASH", "BORDTENNIS", "GOLF", "HOCKEY",
            "ISHOCKEY", "RUGBY", "BASEBALL", "CRICKET", "BOKSNING", "BRYDNING",
            "JUDO", "KARATE", "TAEKWONDO", "FÆGTNING", "BUESKYDNING",
            "SVØMNING", "DYKNING", "SURFING", "SEJLSPORT", "RONING", "KANO",
            "SKI", "SNOWBOARD", "SKØJTER", "SLÆDE", "KÆLK",
            "LØBE", "CYKLING", "GYMNASTIK", "YOGA", "PILATES", "AEROBIC",
            "STYRKETRÆNING", "VÆGTLØFTNING", "CROSSFIT", "DANS",
            "SKAK", "DAM", "BACKGAMMON", "DOMINO", "TERNINGER", "KORTSPIL",
            "PUSLESPIL", "KRYDSORD", "SUDOKU", "LEGO", "DUKKER", "BAMSER",

            // Clothing
            "TØJ", "JAKKE", "FRAKKE", "BLAZER", "CARDIGAN", "SWEATER", "TRØJE",
            "BLUSE", "SKJORTE", "TSHIRT", "TOP", "KJOLE", "NEDERDEL", "BUKSER",
            "JEANS", "SHORTS", "LEGGINGS", "JUMPSUIT", "DRAGT", "HABIT",
            "SOKKER", "STRØMPER", "STRØMPEBUKSER", "UNDERTØJ", "BH", "TRUSSER",
            "BOXERSHORTS", "NATTØJ", "PYJAMAS", "BADEKÅBE", "MORGENKÅBE",
            "SKO", "STØVLER", "SANDALER", "SNEAKERS", "STILLETTER", "FLADE",
            "GUMMISTØVLER", "VANDRESTØVLER", "LØBESKO", "HJEMMESKO",
            "HAT", "KASKET", "HUE", "TØRKLÆDE", "HALSTØRKLÆDE", "HANDSKER",
            "VANTER", "BÅL", "SOLBRILLER", "BRILLER", "SMYKKER", "RING",
            "HALSKÆDE", "ARMBÅND", "ØRERINGE", "URET", "BÆLTE", "TASKE",
            "HÅNDTASKE", "RYGSÆK", "KUFFERT", "PUNGE",

            // Music
            "MUSIK", "SANG", "MELODI", "RYTME", "HARMONI", "AKKORD", "TONE",
            "GUITAR", "KLAVER", "FLYGEL", "VIOLIN", "CELLO", "KONTRABAS",
            "FLØJTE", "KLARINET", "SAXOFON", "TROMPET", "TROMBONE", "TUBA",
            "TROMMER", "TROMME", "TAMBURIN", "HARMONIKA", "BANJO", "HARPE",
            "ORGEL", "SYNTHESIZER", "KEYBOARD",

            // Tools
            "HAMMER", "SØME", "SKRUER", "SKRUETRÆKKER", "TANG", "SAKSE", "KNIVE",
            "SAV", "BOR", "BOREMASKINE", "HØVL", "MEJSEL", "FIL", "RASPE",
            "MÅLEBÅND", "VATERPAS", "VINKELMÅLER", "STIGE", "TRAPPETRINS",
            "SPAND", "KOST", "GULVSKRUBBE", "MOPPE", "FEJEBAKKE", "KLUD",
            "SVAMP", "BØRSTE", "PENSEL", "RULLE", "SPARTELE", "SANDPAPIR",
            "LIM", "TAPE", "SNOR", "REB", "KÆDE", "WIRE", "TRÅDE"
        });

        // === BODY PARTS (KROP) ===
        AddWords(new[]
        {
            "HOVED", "ANSIGT", "PANDE", "ØJNE", "NÆSE", "MUND", "LÆBER", "TUNGE",
            "TÆNDER", "ØREN", "KIND", "HAGE", "HALS", "NAKKE", "SKULDER", "SKULDRE",
            "ARM", "ARME", "ALBUE", "HÅNDLED", "HÅND", "HÆNDER", "FINGRE", "FINGER",
            "TOMMELFINGER", "PEGEFINGER", "LANGFINGER", "RINGFINGER", "LILLEFINGER",
            "NEGL", "KNOER", "BRYST", "MAVE", "NAVLE", "RYGE", "RYGSØJLE", "RIBBEN",
            "HOFTE", "HOFTER", "BAG", "BALDE", "BEN", "BENE", "LÅR", "KNÆ", "KNÆER",
            "SKINNEBEN", "ANKEL", "FOD", "FØDDER", "HÆL", "TÅ", "TÆER",
            "HJERTE", "LUNGE", "LUNGER", "LEVER", "NYRE", "NYRER", "HJERNE",
            "MUSKLER", "KNOGLE", "KNOGLER", "LED", "SENE", "SENER", "BLOD", "HUDE"
        });

        // === PROFESSIONS (ERHVERV) ===
        AddWords(new[]
        {
            "LÆGE", "LÆGER", "SYGEPLEJERSKE", "TANDLÆGE", "KIRURG", "PSYKOLOG",
            "ADVOKAT", "DOMMER", "POLITIBETJENT", "BRANDMAND", "AMBULANCEFØRER",
            "LÆRER", "LÆRERE", "PROFESSOR", "FORSKER", "VIDENSKABSMAND",
            "INGENIØR", "ARKITEKT", "DESIGNER", "KUNSTNER", "MALER", "BILLEDHUGGER",
            "MUSIKER", "SANGER", "KOMPONIST", "DIRIGENT", "SKUESPILLER",
            "FORFATTER", "JOURNALIST", "FOTOGRAF", "FILMINSTRUKTØR",
            "KOK", "TJENER", "BARTENDER", "BAGER", "SLAGTER", "FISKER",
            "LANDMAND", "GARTNER", "SKOVFOGED", "JÆGER",
            "TØMRER", "MURER", "ELEKTRIKER", "VVS", "MEKANIKER", "SMED",
            "SNEDKER", "BLIKKENSLAGER", "GULVLÆGGER", "TÆKKEMAND",
            "PILOT", "FLYVELEDER", "KAPTAJN", "STYRMAND", "MATROS",
            "CHAUFFØR", "TAXACHAUFFØR", "BUSCHAUFFØR", "LOKOFØRER",
            "FRISØR", "KOSMETOLOG", "MASSØR", "FYSIOTERAPEUT",
            "REVISOR", "ØKONOM", "BANKRÅDGIVER", "EJENDOMSMÆGLER",
            "PROGRAMMØR", "WEBUDVIKLER", "GRAFIKER", "ANIMATOR"
        });

        // === COLORS (FARVER) ===
        AddWords(new[]
        {
            "RØD", "RØDME", "BLÅ", "BLÅLIG", "GRØN", "GUL", "ORANGE", "LILLA",
            "VIOLET", "PINK", "ROSA", "HVID", "SORT", "GRÅ", "BRUN", "BEIGE",
            "TURKIS", "CYAN", "MAGENTA", "GULD", "SØLV", "BRONZE", "KOBBER"
        });

        // === NUMBERS AND MATH (TAL OG MATEMATIK) ===
        AddWords(new[]
        {
            "TAL", "NUMMER", "CIFRE", "NUL", "ÉN", "TO", "TRE", "FIRE", "FEM",
            "SEKS", "SYV", "OTTE", "NI", "TI", "TYVE", "TREDIVE", "FYRRE",
            "HALVTREDS", "TRES", "HALVFJERDS", "FIRS", "HALVFEMS", "HUNDREDE",
            "TUSIND", "MILLION", "MILLIARD",
            "PLUS", "MINUS", "GANGE", "DELT", "LIGMED", "PROCENT", "BRØK",
            "DECIMAL", "KVART", "HALVDEL", "TREDJEDEL", "FJERDEDEL",
            "LIGNING", "FORMEL", "FUNKTION", "GRAF", "KURVE",
            "CIRKEL", "TREKANT", "FIRKANT", "REKTANGEL", "KVADRAT", "FEMKANT",
            "SEKSKANT", "POLYGON", "KUGLE", "TERNING", "CYLINDER", "KEGLE",
            "PYRAMIDE", "PRISME"
        });

        // === FAMILY (FAMILIE) ===
        AddWords(new[]
        {
            "FAMILIE", "MOR", "FAR", "FORÆLDRE", "BARN", "BØRN", "SØN", "DATTER",
            "BROR", "SØSTER", "SØSKENDE", "BEDSTEMOR", "BEDSTEFAR", "BEDSTEFORÆLDRE",
            "BARNEBARN", "BØRNEBØRN", "ONKEL", "TANTE", "FÆTTER", "KUSINE",
            "NEVØ", "NIECE", "SVIGERMOR", "SVIGERFAR", "SVIGERFORÆLDRE",
            "SVIGERSØN", "SVIGERDATTER", "SVOGER", "SVIGERINDE",
            "MAND", "KONE", "ÆGTEFÆLLE", "FORLOVEDE", "KÆRESTE",
            "VEN", "VENINDE", "VENNER", "BEKENDT", "NABO"
        });

        // === EMOTIONS (FØLELSER) ===
        AddWords(new[]
        {
            "GLAD", "GLÆDE", "LYKKELIG", "TRIST", "SORG", "VREDE", "SUR", "RASENDE",
            "BANGE", "ANGST", "FRYGT", "NERVØS", "BEKYMRET", "ROLIG", "AFSLAPPET",
            "TRÆT", "UDMATTET", "ENERGISK", "BEGEJSTRET", "SPÆNDT", "OVERRASKET",
            "FORVIRRET", "SKUFFET", "FRUSTRERET", "IRRITERET", "GENERT",
            "FLOV", "STOLT", "TAKNEMLIG", "JALOUX", "MISUNDELIG",
            "KÆRLIGHED", "HAD", "HÅBET", "FORTVIVLELSE", "ENSOMHED", "LÆNGSEL",
            "NOSTALGI", "NYSGERRIGHED", "UNDREN", "INSPIRATION", "MOTIVATION"
        });

        // === PLACES (STEDER) ===
        AddWords(new[]
        {
            "BY", "BYER", "LANDSBY", "HOVEDSTAD", "STORBY", "FORSTAD",
            "LAND", "LANDE", "STAT", "NATION", "REGION", "PROVINS", "KOMMUNE",
            "KONTINENT", "VERDEN", "JORDEN", "PLANET", "RUMMET", "UNIVERS",
            "EUROPA", "ASIEN", "AFRIKA", "AMERIKA", "AUSTRALIEN", "ANTARKTIS",
            "DANMARK", "NORGE", "SVERIGE", "FINLAND", "ISLAND", "GRØNLAND",
            "TYSKLAND", "FRANKRIG", "ENGLAND", "ITALIEN", "SPANIEN", "PORTUGAL",
            "HOLLAND", "BELGIEN", "SCHWEIZ", "ØSTRIG", "POLEN", "RUSLAND",
            "KØBENHAVN", "AARHUS", "ODENSE", "AALBORG", "ESBJERG", "RANDERS"
        });

        // === SCHOOL (SKOLE) ===
        AddWords(new[]
        {
            "SKOLE", "SKOLER", "KLASSE", "LEKTION", "FAG", "PRØVE", "EKSAMEN",
            "LEKTIER", "PROJEKT", "OPGAVE", "DIKTAT", "STIL", "REFERAT",
            "KARAKTER", "DIPLOM", "BEVIS", "CERTIFIKAT",
            "DANSK", "ENGELSK", "TYSK", "FRANSK", "SPANSK", "MATEMATIK",
            "FYSIK", "KEMI", "BIOLOGI", "GEOGRAFI", "HISTORIE", "SAMFUNDSFAG",
            "RELIGION", "IDRÆT", "MUSIK", "BILLEDKUNST", "HÅNDVÆRK", "HJEMKUNDSKAB",
            "BOG", "BØGER", "HÆFTE", "BLOK", "PAPIR", "PEN", "BLYANT", "KUGLEPEN",
            "VISKELÆDER", "LINEAL", "PASSER", "VINKELMÅLER", "LOMMEREGNER",
            "TASKE", "PENALHUS", "MAPPE", "TAVLE", "KRIDT", "TUSCH"
        });

        _logger.LogInformation("Initialized {Count} Danish words", _validWords.Count);
    }

    private void AddWords(string[] words)
    {
        foreach (var word in words)
        {
            var cleaned = word.Trim().ToUpper();
            if (!string.IsNullOrWhiteSpace(cleaned))
            {
                _validWords.Add(cleaned);
            }
        }
    }
}
