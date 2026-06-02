import os
from psd_tools import PSDImage

# --- Configurations ---
# Source folder relative to project root
PSD_SOURCE_FOLDER = r"TempPSDs"
# Destination folder relative to project root
OUTPUT_BASE_FOLDER = r"public/assets/slide_layers"

# --- Main Logic ---
def extract_layers_from_psds():
    # Ensure source folder exists
    if not os.path.exists(PSD_SOURCE_FOLDER):
        print(f"Error: Source PSD folder not found at: {PSD_SOURCE_FOLDER}")
        return

    # Loop through all PSD files in the source folder
    for filename in os.listdir(PSD_SOURCE_FOLDER):
        if filename.lower().endswith(".psd"):
            psd_path = os.path.join(PSD_SOURCE_FOLDER, filename)
            slide_name = os.path.splitext(filename)[0] # e.g., 'slide-05'

            # Create a specific output folder for this slide's layers
            slide_output_folder = os.path.join(OUTPUT_BASE_FOLDER, slide_name)
            if not os.path.exists(slide_output_folder):
                os.makedirs(slide_output_folder)

            print(f"Processing PSD: {filename}...")

            try:
                # Open the PSD file
                psd = PSDImage.open(psd_path)

                # Loop through all layers (descendants gets nested layers inside groups)
                # We prioritize groups or individual layers marked for export
                layer_count = 0
                for i, layer in enumerate(psd.descendants()):
                    # Skip folders/groups themselves, only export visible graphical content
                    if layer.is_visible() and layer.kind != 'psdimage':
                        # Clean up the layer name to use as a filename
                        clean_layer_name = "".join([c if c.isalnum() or c=='_' else '' for c in layer.name]).rstrip()
                        if not clean_layer_name:
                            clean_layer_name = f"layer_{i}"

                        output_filename = f"{slide_name}_{clean_layer_name}.png"
                        output_path = os.path.join(slide_output_folder, output_filename)

                        # Extract the graphical content of the layer and save as PNG
                        layer_image = layer.composite()
                        if layer_image:
                            layer_image.save(output_path)
                            print(f"  Extracted: {output_filename}")
                            layer_count += 1
                        else:
                            print(f"  Skipped (no graphical content): {layer.name}")

                print(f"Done processing {filename}. Extracted {layer_count} layers to {slide_output_folder}.")

            except Exception as e:
                print(f"Error processing {filename}: {e}")

    print("\nAll PSDs processed.")

if __name__ == "__main__":
    extract_layers_from_psds()