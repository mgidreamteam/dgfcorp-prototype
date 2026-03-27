// ==========================================
// Jet Engine Turbine Blade using BOSL2
// Features: Cambered Airfoil, Platform, Dovetail Root
// ==========================================

include <BOSL2/std.scad>

// --- USER PARAMETERS ---
// Blade Dimensions
blade_height = 40;       
root_chord = 18;         
tip_chord = 12;           
root_thickness = 4;      
tip_thickness = 1.5;     
total_twist = -35;       
blade_camber = 4;        // How "bent" or crescent-shaped the blade is
num_slices = 20;         

// Root & Platform Dimensions
platform_width = 20;
platform_depth = 12;
platform_thickness = 2;
root_height = 10;
root_top_width = 8;
root_bottom_width = 14;

// --- AIRFOIL MATHEMATICS (WITH CAMBER) ---
function make_cambered_airfoil(chord, thickness, camber) =
    [for (a = [0 : 5 : 355]) 
        let (
            x = (chord / 2) * cos(a),
            norm_x = max(0, (x + chord/2) / chord), 
            // Standard teardrop thickness
            y_base = (thickness / 2) * sin(a) * (0.2 + 0.8 * sqrt(norm_x)),
            // Parabolic curve to bend the blade into a crescent
            camber_offset = camber * (1 - pow((2 * x / chord), 2)),
            y = y_base + camber_offset
        )
        [x, y]
    ];

// --- 3D LOFTING CALCULATIONS ---
blade_profiles = [
    for (i = [0 : num_slices])
        let (
            u = i / num_slices, 
            
            current_chord = root_chord - (root_chord - tip_chord) * u,
            current_thick = root_thickness - (root_thickness - tip_thickness) * u,
            current_camber = blade_camber * (1 - u * 0.5), // Camber reduces slightly towards tip
            current_twist = total_twist * u,
            current_z = blade_height * u,
            
            path_2d = make_cambered_airfoil(current_chord, current_thick, current_camber),
            
            path_3d_twisted = [for (p = path_2d)
                [
                    p[0] * cos(current_twist) - p[1] * sin(current_twist),
                    p[0] * sin(current_twist) + p[1] * cos(current_twist),
                    current_z
                ]
            ]
        )
        path_3d_twisted
];

// ==========================================
// --- HARDWARE MODULES ---
// ==========================================

module blade_platform() {
    color("silver")
    translate([0, 0, -platform_thickness/2])
    // A slightly rounded cube for the gas-path floor
    cuboid([platform_width, platform_depth, platform_thickness], rounding=1, edges="Z");
}

module dovetail_root() {
    color("dimgray")
    translate([0, 0, -platform_thickness])
    // Rotate to match the base angle of the blade so it slides in properly
    rotate([90, 0, 0])
    linear_extrude(height=platform_depth, center=true)
    polygon([
        [-root_top_width/2, 0],
        [root_top_width/2, 0],
        [root_bottom_width/2, -root_height],
        [-root_bottom_width/2, -root_height]
    ]);
}

// ==========================================
// --- FINAL ASSEMBLY ---
// ==========================================

union() {
    // 1. The Aerodynamic Blade (Skinning the profiles)
    color("cyan")
    skin(blade_profiles, slices=0);
    
    // 2. The Platform (Gas path seal)
    blade_platform();
    
    // 3. The Dovetail Mounting Root
    dovetail_root();
}